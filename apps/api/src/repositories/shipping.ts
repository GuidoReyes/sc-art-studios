import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import type { Parcel, RateCandidate } from "../lib/shipping.js";

const GRAMS_PER_KG = 1000;
const CENTS_PER_USD = 100;
const BASIS_POINTS_PER_PCT = 100;

export interface ShippingZoneRates {
  code: string;
  rates: RateCandidate[];
}

export interface QuoteSettings {
  volumetricDivisor: number;
  /** Shopify por proveedor externo + pasarela, en puntos básicos (7.40 % = 740). */
  commissionBasisPoints: number;
}

export type MaskParcelResult =
  | { status: "found"; parcel: Parcel }
  | { status: "not-found" }
  /** Pública, pero aún sin peso o sin perfil de empaque cargado en el admin. */
  | { status: "incomplete" };

export interface ShippingRepository {
  findMaskParcel(maskId: string): Promise<MaskParcelResult>;
  /** Tarifas vigentes en `at` de la zona del país; null si ninguna zona lo incluye. */
  findZoneRates(country: string, at: Date): Promise<ShippingZoneRates | null>;
  /** null si todavía no hay CostSettings (falta correr el seed). */
  findQuoteSettings(): Promise<QuoteSettings | null>;
}

const RATE_SELECT = {
  carrier: true,
  service: true,
  maxWeightKg: true,
  costUsd: true,
  isEstimate: true,
} satisfies Prisma.ShippingRateSelect;

type RateRow = Prisma.ShippingRateGetPayload<{ select: typeof RATE_SELECT }>;

// Los DECIMAL tienen 2 decimales: pasarlos a enteros es exacto.
const toUnits = (value: Prisma.Decimal, factor: number) => value.mul(factor).round().toNumber();

function toRateCandidate(row: RateRow): RateCandidate {
  return {
    carrier: row.carrier,
    service: row.service,
    maxWeightGrams: toUnits(row.maxWeightKg, GRAMS_PER_KG),
    costCents: toUnits(row.costUsd, CENTS_PER_USD),
    isEstimate: row.isEstimate,
  };
}

// `countries` es JSON escrito por el seed o el admin: se revisa antes de confiar en él.
function includesCountry(countries: Prisma.JsonValue, country: string): boolean {
  return Array.isArray(countries) && countries.includes(country);
}

function validAt(at: Date): Prisma.ShippingRateWhereInput {
  return { validFrom: { lte: at }, OR: [{ validTo: null }, { validTo: { gt: at } }] };
}

export function createPrismaShippingRepository(prisma: PrismaClient): ShippingRepository {
  return {
    async findMaskParcel(maskId) {
      // Un borrador no se cotiza: para el público no existe.
      const mask = await prisma.mask.findFirst({
        where: { id: maskId, status: { not: "DRAFT" } },
        select: {
          weightGrams: true,
          packagingProfile: {
            select: { outerLengthCm: true, outerWidthCm: true, outerHeightCm: true, packagingWeightGrams: true },
          },
        },
      });
      if (!mask) return { status: "not-found" };
      const { weightGrams, packagingProfile: box } = mask;
      if (weightGrams === null || !box) return { status: "incomplete" };
      // Empacada: la máscara va dentro de la caja, así que cuentan las medidas exteriores.
      return {
        status: "found",
        parcel: {
          weightGrams: weightGrams + box.packagingWeightGrams,
          lengthCm: box.outerLengthCm.toNumber(),
          widthCm: box.outerWidthCm.toNumber(),
          heightCm: box.outerHeightCm.toNumber(),
        },
      };
    },

    async findZoneRates(country, at) {
      // Son pocas zonas: se filtran aquí en vez de depender del soporte JSON de MySQL.
      const zones = await prisma.shippingZone.findMany({
        select: { code: true, countries: true, rates: { where: validAt(at), select: RATE_SELECT } },
        orderBy: { code: "asc" },
      });
      const zone = zones.find(({ countries }) => includesCountry(countries, country));
      return zone ? { code: zone.code, rates: zone.rates.map(toRateCandidate) } : null;
    },

    async findQuoteSettings() {
      // Versionada: la vigente es la de id más alto.
      const settings = await prisma.costSettings.findFirst({
        select: { volumetricDivisor: true, gatewayPct: true, shopifyThirdPartyPct: true },
        orderBy: { id: "desc" },
      });
      if (!settings) return null;
      return {
        volumetricDivisor: settings.volumetricDivisor,
        commissionBasisPoints: toUnits(settings.gatewayPct.add(settings.shopifyThirdPartyPct), BASIS_POINTS_PER_PCT),
      };
    },
  };
}
