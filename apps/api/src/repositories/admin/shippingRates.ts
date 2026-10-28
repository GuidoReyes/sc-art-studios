// /api/admin/shipping-rates (tarea 42): tarifas por zona, transportista y tramo de peso, con su fuente
// y vigencia. El cotizador público usa solo las vigentes (repositories/shipping.ts).
import type { AdminShippingRateDto, AdminShippingZoneDto } from "@sc-art-studio/shared";
import type { Carrier, PrismaClient, ShippingRate } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpErrors.js";
import type { AdminPageQuery } from "./stories.js";
import { type AdminStore, type EntityOps, createAdminStore, toPlain } from "./store.js";

export interface ShippingRateInput {
  carrier: Carrier;
  service: string;
  zoneId: string;
  maxWeightKg: number;
  costUsd: number;
  validFrom: Date;
  validTo?: Date | null;
  source: string;
  isEstimate?: boolean;
}

export type ShippingRatePatch = Partial<ShippingRateInput>;

export interface AdminShippingRateQuery extends AdminPageQuery {
  zoneId?: string;
}

export type AdminShippingRateStore = AdminStore<AdminShippingRateDto, ShippingRateInput, ShippingRatePatch, AdminShippingRateQuery>;

export interface ShippingZoneRepository {
  list(): Promise<AdminShippingZoneDto[]>;
}

const toDto = (row: ShippingRate): AdminShippingRateDto => toPlain(row);

/** Una tarifa que vence antes de empezar nunca estaría vigente. */
export function assertValidPeriod(validFrom: Date, validTo: Date | null | undefined): void {
  if (validTo && validTo <= validFrom) {
    throw new HttpError(422, "La fecha de fin debe ser posterior a la de inicio", "INVALID_PERIOD");
  }
}

export const shippingRateOps: EntityOps<AdminShippingRateDto, ShippingRateInput, ShippingRatePatch, AdminShippingRateQuery> = {
  entity: "ShippingRate",
  action: "shippingRate",
  duplicateMessage: "Esa tarifa ya existe",
  async list(db, { zoneId, page, limit }) {
    const where = zoneId ? { zoneId } : {};
    const [rows, total] = await db.$transaction([
      db.shippingRate.findMany({
        where,
        orderBy: [{ zone: { code: "asc" } }, { carrier: "asc" }, { service: "asc" }, { maxWeightKg: "asc" }, { validFrom: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.shippingRate.count({ where }),
    ]);
    return { items: rows.map(toDto), total };
  },
  find: async (db, id) => {
    const row = await db.shippingRate.findUnique({ where: { id } });
    return row ? toDto(row) : null;
  },
  insert: async (tx, input) => {
    assertValidPeriod(input.validFrom, input.validTo);
    return toDto(await tx.shippingRate.create({ data: input }));
  },
  patch: async (tx, id, input) => {
    const current = await tx.shippingRate.findUniqueOrThrow({ where: { id } });
    const validTo = input.validTo === undefined ? current.validTo : input.validTo;
    assertValidPeriod(input.validFrom ?? current.validFrom, validTo);
    return toDto(await tx.shippingRate.update({ where: { id }, data: input }));
  },
  delete: async (tx, id) => (await tx.shippingRate.deleteMany({ where: { id } })).count,
};

export const createPrismaAdminShippingRateStore = (prisma: PrismaClient): AdminShippingRateStore =>
  createAdminStore(prisma, shippingRateOps);

// `countries` es JSON: solo se devuelven los códigos que sean texto.
const asCountries = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((code): code is string => typeof code === "string") : [];

export const createPrismaShippingZoneRepository = (prisma: PrismaClient): ShippingZoneRepository => ({
  async list() {
    const zones = await prisma.shippingZone.findMany({ orderBy: { code: "asc" } });
    return zones.map(({ id, code, name, countries }) => ({ id, code, name, countries: asCountries(countries) }));
  },
});
