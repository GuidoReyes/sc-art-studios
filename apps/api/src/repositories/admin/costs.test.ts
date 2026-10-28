// Costos y envíos del admin (tarea 42): versiones de CostSettings, tarifas y cajas.
import { describe, expect, it, vi } from "vitest";
import type { CostSettingsValues } from "@sc-art-studio/shared";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpErrors.js";
import { changedSettings, createPrismaCostSettingsRepository, dutyReviewStatus } from "./costSettings.js";
import { assertOuterFitsInner, packagingProfileOps } from "./packagingProfiles.js";
import { assertValidPeriod, shippingRateOps } from "./shippingRates.js";

const ACTOR = { userId: "u1", ip: "203.0.113.5" };
const SEEDED = new Date("2026-10-13T00:00:00.000Z");
const NOW = new Date("2026-10-28T12:00:00.000Z");
const d = (value: string | number) => new Prisma.Decimal(value);

const VALUES: CostSettingsValues = {
  fxUsdGtq: 7.645,
  gatewayPct: 5.4,
  gatewayFixedUsd: 0.3,
  shopifyThirdPartyPct: 2,
  monthlyFixedUsd: 54.94,
  expectedUnitsPerMonth: 8,
  laborRateGtqPerHour: 25,
  targetMarginPct: 40,
  volumetricDivisor: 5000,
  usImportDutyPct: 10,
};

function settingsRow(id: number, overrides: Partial<CostSettingsValues> = {}, updatedAt = SEEDED) {
  const values = { ...VALUES, ...overrides };
  return {
    id,
    fxUsdGtq: d(values.fxUsdGtq),
    gatewayPct: d(values.gatewayPct),
    gatewayFixedUsd: d(values.gatewayFixedUsd),
    shopifyThirdPartyPct: d(values.shopifyThirdPartyPct),
    monthlyFixedUsd: d(values.monthlyFixedUsd),
    expectedUnitsPerMonth: values.expectedUnitsPerMonth,
    laborRateGtqPerHour: d(values.laborRateGtqPerHour),
    targetMarginPct: d(values.targetMarginPct),
    volumetricDivisor: values.volumetricDivisor,
    usImportDutyPct: d(values.usImportDutyPct),
    usImportDutyReviewedAt: SEEDED,
    updatedAt,
    updatedById: null,
    updatedBy: null,
  };
}

type SettingsRow = ReturnType<typeof settingsRow>;

function fakeSettingsDb(rows: SettingsRow[]) {
  const tx = {
    costSettings: {
      findFirst: vi.fn(async () => rows[0] ?? null),
      create: vi.fn(async ({ data }: { data: CostSettingsValues & Record<string, unknown> }) => ({
        ...settingsRow(99, data, data.updatedAt as Date),
        usImportDutyReviewedAt: data.usImportDutyReviewedAt as Date,
        updatedById: ACTOR.userId,
        updatedBy: { email: "admin@example.com" },
      })),
    },
    auditLog: { create: vi.fn(async (_args: object) => ({})) },
  };
  const prisma = {
    costSettings: { findMany: vi.fn(async () => rows) },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>, _options?: object) => fn(tx)),
  };
  return { tx, prisma, repository: createPrismaCostSettingsRepository(prisma as unknown as PrismaClient) };
}

describe("CostSettings: versiones", () => {
  it("la vigente es la de id más alto y cada versión dice qué cambió", async () => {
    const { repository } = fakeSettingsDb([settingsRow(3, { gatewayPct: 4.9 }), settingsRow(2), settingsRow(1, { fxUsdGtq: 7.7 })]);

    const overview = await repository.overview(10);

    expect(overview?.current).toMatchObject({ id: 3, changedFields: ["gatewayPct"], updatedByEmail: null });
    expect(overview?.current.values.gatewayPct).toBe(4.9);
    expect(overview?.history.map((version) => [version.id, version.changedFields])).toEqual([
      [2, ["fxUsdGtq"]],
      [1, null],
    ]);
  });

  it("pide una fila de más para saber qué cambió en la más vieja que muestra", async () => {
    const { prisma, repository } = fakeSettingsDb([settingsRow(3), settingsRow(2, { gatewayPct: 4.9 }), settingsRow(1)]);

    const overview = await repository.overview(1);

    expect(prisma.costSettings.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { id: "desc" }, take: 3 }));
    expect(overview?.history).toHaveLength(1);
    expect(overview?.history[0]?.changedFields).toEqual(["gatewayPct"]);
  });

  it("sin filas no hay resumen (falta el seed)", async () => {
    await expect(fakeSettingsDb([]).repository.overview(10)).resolves.toBeNull();
  });

  it("guardar crea una versión nueva con quién fue y lo audita en la misma transacción", async () => {
    const { tx, prisma, repository } = fakeSettingsDb([settingsRow(1)]);

    const saved = await repository.save({ baseVersionId: 1, values: { ...VALUES, gatewayPct: 4.9 } }, ACTOR, NOW);

    expect(saved).toMatchObject({ id: 99, changedFields: ["gatewayPct"], updatedByEmail: "admin@example.com" });
    expect(tx.costSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gatewayPct: 4.9, updatedById: "u1", updatedAt: NOW }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        ip: ACTOR.ip,
        action: "costSettings.update",
        entity: "CostSettings",
        entityId: "99",
        diff: { before: { gatewayPct: 5.4 }, after: { gatewayPct: 4.9 } },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });

  it("si el arancel no cambia ni se confirma, conserva la fecha de revisión anterior", async () => {
    const { tx, repository } = fakeSettingsDb([settingsRow(1)]);

    const saved = await repository.save({ baseVersionId: 1, values: { ...VALUES, fxUsdGtq: 7.7 } }, ACTOR, NOW);

    expect(saved.usImportDutyReviewedAt).toBe(SEEDED.toISOString());
    expect(tx.auditLog.create.mock.calls[0]?.[0]).not.toHaveProperty("data.diff.dutyReviewed");
  });

  it("cambiar el arancel o confirmarlo lo marca revisado hoy", async () => {
    const changed = await fakeSettingsDb([settingsRow(1)]).repository.save(
      { baseVersionId: 1, values: { ...VALUES, usImportDutyPct: 15 } },
      ACTOR,
      NOW,
    );
    const { tx, repository } = fakeSettingsDb([settingsRow(1)]);
    const confirmed = await repository.save({ baseVersionId: 1, values: VALUES, dutyReviewed: true }, ACTOR, NOW);

    expect(changed.usImportDutyReviewedAt).toBe(NOW.toISOString());
    expect(confirmed.usImportDutyReviewedAt).toBe(NOW.toISOString());
    expect(tx.auditLog.create.mock.calls[0]?.[0]).toMatchObject({ data: { diff: { before: {}, after: {}, dutyReviewed: true } } });
  });

  it("409 si otra persona guardó una versión después de la que se editó", async () => {
    const { tx, repository } = fakeSettingsDb([settingsRow(2)]);

    const saving = repository.save({ baseVersionId: 1, values: VALUES }, ACTOR, NOW);

    await expect(saving).rejects.toMatchObject({ status: 409, code: "STALE" });
    expect(tx.costSettings.create).not.toHaveBeenCalled();
  });

  it("si MySQL cancela la transacción por choque con otro guardado, también es 409", async () => {
    const { prisma, repository } = fakeSettingsDb([settingsRow(1)]);
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error("conflicto"), { code: "P2034" }));

    await expect(repository.save({ baseVersionId: 1, values: VALUES }, ACTOR, NOW)).rejects.toMatchObject({ status: 409 });
  });

  it("guardar sin cambios ni confirmación es 422 y no crea versión", async () => {
    const { tx, repository } = fakeSettingsDb([settingsRow(1)]);

    await expect(repository.save({ baseVersionId: 1, values: VALUES }, ACTOR, NOW)).rejects.toMatchObject({
      status: 422,
      code: "NO_CHANGES",
    });
    expect(tx.costSettings.create).not.toHaveBeenCalled();
  });

  it("changedSettings compara campo por campo en orden fijo", () => {
    expect(changedSettings(VALUES, { ...VALUES, usImportDutyPct: 15, fxUsdGtq: 7.7 })).toEqual(["fxUsdGtq", "usImportDutyPct"]);
    expect(changedSettings(VALUES, { ...VALUES })).toEqual([]);
  });
});

describe("dutyReviewStatus", () => {
  it("vence exactamente a los N días de la revisión", () => {
    const dueAt = new Date("2026-12-12T00:00:00.000Z");

    expect(dutyReviewStatus(SEEDED, new Date(dueAt.getTime() - 1), 60)).toEqual({ dueAt, isDue: false });
    expect(dutyReviewStatus(SEEDED, dueAt, 60)).toEqual({ dueAt, isDue: true });
  });
});

const RATE_ROW = {
  id: "r1",
  carrier: "FEDEX",
  service: "International Economy",
  zoneId: "z1",
  maxWeightKg: d("1.00"),
  costUsd: d("138.80"),
  validFrom: new Date("2026-01-05T00:00:00.000Z"),
  validTo: null,
  source: "https://www.fedex.com/tarifas.pdf",
  isEstimate: true,
  createdAt: SEEDED,
  updatedAt: SEEDED,
};

function fakeRateTx(row = RATE_ROW) {
  const tx = {
    shippingRate: {
      findMany: vi.fn(async () => [row]),
      count: vi.fn(async () => 1),
      findUniqueOrThrow: vi.fn(async () => row),
      create: vi.fn(async () => row),
      update: vi.fn(async () => row),
    },
    $transaction: vi.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
  };
  return { tx, client: tx as unknown as Prisma.TransactionClient, db: tx as unknown as PrismaClient };
}

describe("tarifas de envío", () => {
  it("lista por zona, transportista, servicio y peso, con montos como número", async () => {
    const { tx, db } = fakeRateTx();

    const page = await shippingRateOps.list(db, { zoneId: "z1", page: 1, limit: 48 });

    expect(page.items[0]).toMatchObject({ maxWeightKg: 1, costUsd: 138.8, validFrom: "2026-01-05T00:00:00.000Z" });
    expect(tx.shippingRate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { zoneId: "z1" }, take: 48, orderBy: expect.arrayContaining([{ zone: { code: "asc" } }]) }),
    );
  });

  it("no crea una tarifa que vence antes de empezar", async () => {
    const { tx, client } = fakeRateTx();
    const input = {
      carrier: "FEDEX" as const,
      service: "Economy",
      zoneId: "z1",
      maxWeightKg: 1,
      costUsd: 100,
      validFrom: new Date("2026-02-01T00:00:00.000Z"),
      validTo: new Date("2026-01-01T00:00:00.000Z"),
      source: "cotización 2026-01-01",
    };

    await expect(shippingRateOps.insert(client, input)).rejects.toMatchObject({ status: 422, code: "INVALID_PERIOD" });
    expect(tx.shippingRate.create).not.toHaveBeenCalled();
  });

  it("al editar compara la fecha nueva con la que ya tenía", async () => {
    const { tx, client } = fakeRateTx();

    await expect(shippingRateOps.patch(client, "r1", { validTo: new Date("2025-12-31T00:00:00.000Z") })).rejects.toBeInstanceOf(
      HttpError,
    );
    await shippingRateOps.patch(client, "r1", { validTo: new Date("2026-12-31T00:00:00.000Z") });

    expect(tx.shippingRate.update).toHaveBeenCalledOnce();
  });

  it("assertValidPeriod acepta sin fecha de fin", () => {
    expect(() => assertValidPeriod(RATE_ROW.validFrom, null)).not.toThrow();
    expect(() => assertValidPeriod(RATE_ROW.validFrom, RATE_ROW.validFrom)).toThrow(HttpError);
  });
});

const BOX = {
  innerLengthCm: 25,
  innerWidthCm: 20,
  innerHeightCm: 15,
  outerLengthCm: 30,
  outerWidthCm: 25,
  outerHeightCm: 20,
};

const BOX_ROW = {
  id: "b1",
  name: "Estándar (supuesto)",
  innerLengthCm: d("25.0"),
  innerWidthCm: d("20.0"),
  innerHeightCm: d("15.0"),
  outerLengthCm: d("30.0"),
  outerWidthCm: d("25.0"),
  outerHeightCm: d("20.0"),
  packagingWeightGrams: 200,
  costGtq: d("45.00"),
  _count: { masks: 4 },
};

function fakeBoxTx() {
  const tx = {
    packagingProfile: {
      findUnique: vi.fn(async () => BOX_ROW),
      findUniqueOrThrow: vi.fn(async () => BOX_ROW),
      update: vi.fn(async () => BOX_ROW),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
  };
  return { tx, client: tx as unknown as Prisma.TransactionClient };
}

describe("cajas", () => {
  it("devuelve cuántas máscaras la usan", async () => {
    const { client } = fakeBoxTx();

    await expect(packagingProfileOps.find(client, "b1")).resolves.toMatchObject({ costGtq: 45, maskCount: 4, outerLengthCm: 30 });
  });

  it("por fuera no puede ser más chica que por dentro, también al editar una sola medida", async () => {
    const { tx, client } = fakeBoxTx();

    expect(() => assertOuterFitsInner({ ...BOX, outerHeightCm: 14 })).toThrow(HttpError);
    expect(() => assertOuterFitsInner(BOX)).not.toThrow();
    await expect(packagingProfileOps.patch(client, "b1", { innerWidthCm: 26 })).rejects.toMatchObject({
      code: "INVALID_DIMENSIONS",
    });
    expect(tx.packagingProfile.update).not.toHaveBeenCalled();
  });

  it("no deja borrar una caja que usan máscaras, ni si se la asignan mientras se borra", async () => {
    const { tx, client } = fakeBoxTx();

    expect(() => packagingProfileOps.assertDeletable?.({ ...BOX, id: "b1", name: "x", packagingWeightGrams: 1, costGtq: 1, maskCount: 2 })).toThrow(
      expect.objectContaining({ status: 409, code: "IN_USE" }),
    );
    await packagingProfileOps.delete(client, "b1");

    expect(tx.packagingProfile.deleteMany).toHaveBeenCalledWith({ where: { id: "b1", masks: { none: {} } } });
  });
});
