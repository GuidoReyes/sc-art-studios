// Lo que necesita el motor de precios (tarea 15): la CostSettings vigente y el costo de la caja.
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { PricingSettings } from "../../lib/pricing.js";

export interface CurrentPricingSettings extends PricingSettings {
  updatedAt: Date;
}

export interface PricingRepository {
  /** null si todavía no hay CostSettings (falta correr el seed). */
  findSettings(): Promise<CurrentPricingSettings | null>;
  /** null si el perfil de empaque no existe. */
  findPackagingCostGtq(packagingProfileId: string): Promise<Prisma.Decimal | null>;
}

export function createPrismaPricingRepository(prisma: PrismaClient): PricingRepository {
  return {
    async findSettings() {
      // Versionada: la vigente es la de id más alto.
      return prisma.costSettings.findFirst({
        select: {
          fxUsdGtq: true,
          gatewayPct: true,
          gatewayFixedUsd: true,
          shopifyThirdPartyPct: true,
          monthlyFixedUsd: true,
          expectedUnitsPerMonth: true,
          laborRateGtqPerHour: true,
          targetMarginPct: true,
          updatedAt: true,
        },
        orderBy: { id: "desc" },
      });
    },

    async findPackagingCostGtq(packagingProfileId) {
      const box = await prisma.packagingProfile.findUnique({ where: { id: packagingProfileId }, select: { costGtq: true } });
      return box?.costGtq ?? null;
    },
  };
}
