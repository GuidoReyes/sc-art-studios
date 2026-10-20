import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { createPrismaShippingRepository } from "./shipping.js";

const NOW = new Date("2026-10-20T12:00:00.000Z");
const D = (value: string) => new Prisma.Decimal(value);

const BOX = {
  outerLengthCm: D("30.0"),
  outerWidthCm: D("25.0"),
  outerHeightCm: D("20.0"),
  packagingWeightGrams: 200,
};

function fakePrisma({ mask = null, zones = [], settings = null }: { mask?: unknown; zones?: unknown[]; settings?: unknown }) {
  const prisma = {
    mask: { findFirst: vi.fn(async () => mask) },
    shippingZone: { findMany: vi.fn(async () => zones) },
    costSettings: { findFirst: vi.fn(async () => settings) },
  };
  return { prisma, repository: createPrismaShippingRepository(prisma as unknown as PrismaClient) };
}

describe("findMaskParcel", () => {
  it("suma la caja al peso de la máscara y usa las medidas exteriores", async () => {
    const { prisma, repository } = fakePrisma({ mask: { weightGrams: 650, packagingProfile: BOX } });

    const result = await repository.findMaskParcel("m1");

    expect(result).toEqual({
      status: "found",
      parcel: { weightGrams: 850, lengthCm: 30, widthCm: 25, heightCm: 20 },
    });
    // Un borrador no se cotiza.
    expect(prisma.mask.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "m1", status: { not: "DRAFT" } } }),
    );
  });

  it("no encontrada si no existe o es borrador", async () => {
    const { repository } = fakePrisma({});

    expect(await repository.findMaskParcel("m1")).toEqual({ status: "not-found" });
  });

  it("incompleta si falta el peso o el perfil de empaque", async () => {
    const noWeight = fakePrisma({ mask: { weightGrams: null, packagingProfile: BOX } });
    const noBox = fakePrisma({ mask: { weightGrams: 650, packagingProfile: null } });

    expect(await noWeight.repository.findMaskParcel("m1")).toEqual({ status: "incomplete" });
    expect(await noBox.repository.findMaskParcel("m1")).toEqual({ status: "incomplete" });
  });
});

describe("findZoneRates", () => {
  const RATE = {
    carrier: "FEDEX",
    service: "International Economy",
    maxWeightKg: D("1.50"),
    costUsd: D("159.20"),
    isEstimate: true,
  };

  it("devuelve la zona que incluye el país con sus tarifas en gramos y centavos", async () => {
    const { prisma, repository } = fakePrisma({
      zones: [
        { code: "FEDEX-C", countries: ["US", "MX", "CA"], rates: [RATE] },
        { code: "FEDEX-E", countries: ["ES", "DE"], rates: [] },
      ],
    });

    const zone = await repository.findZoneRates("MX", NOW);

    expect(zone).toEqual({
      code: "FEDEX-C",
      rates: [{ carrier: "FEDEX", service: "International Economy", maxWeightGrams: 1500, costCents: 15920, isEstimate: true }],
    });
    // Solo tarifas vigentes en la fecha.
    expect(prisma.shippingZone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          rates: expect.objectContaining({
            where: { validFrom: { lte: NOW }, OR: [{ validTo: null }, { validTo: { gt: NOW } }] },
          }),
        }),
      }),
    );
  });

  it("null si ninguna zona incluye el país", async () => {
    const { repository } = fakePrisma({ zones: [{ code: "FEDEX-C", countries: ["US"], rates: [RATE] }] });

    expect(await repository.findZoneRates("GT", NOW)).toBeNull();
  });

  it("ignora una zona cuyo JSON de países no es un arreglo", async () => {
    const { repository } = fakePrisma({ zones: [{ code: "ROTA", countries: { US: true }, rates: [RATE] }] });

    expect(await repository.findZoneRates("US", NOW)).toBeNull();
  });
});

describe("findQuoteSettings", () => {
  it("suma Shopify y la pasarela en puntos básicos y usa la versión más reciente", async () => {
    const { prisma, repository } = fakePrisma({
      settings: { volumetricDivisor: 5000, gatewayPct: D("5.40"), shopifyThirdPartyPct: D("2.00") },
    });

    expect(await repository.findQuoteSettings()).toEqual({ volumetricDivisor: 5000, commissionBasisPoints: 740 });
    expect(prisma.costSettings.findFirst).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { id: "desc" } }));
  });

  it("null si todavía no hay CostSettings", async () => {
    const { repository } = fakePrisma({});

    expect(await repository.findQuoteSettings()).toBeNull();
  });
});
