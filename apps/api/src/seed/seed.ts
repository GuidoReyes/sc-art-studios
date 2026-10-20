import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { COST_SETTINGS, MASKS, PACKAGING_PROFILE, SHIPPING_RATES, SHIPPING_ZONES } from "./data.js";

/** Cuántas filas creó cada tabla (0 = ya existían). */
export interface SeedSummary {
  shippingZones: number;
  shippingRates: number;
  packagingProfiles: number;
  costSettings: number;
  masks: number;
}

type Tx = Prisma.TransactionClient;

// Solo crea lo que falta y nunca actualiza: si alguien ya cambió un valor en el admin, el seed lo respeta.
// Así se puede correr de nuevo (en local o en producción) sin riesgo.
export async function seedDatabase(prisma: PrismaClient): Promise<SeedSummary> {
  return prisma.$transaction(async (tx) => {
    const { zoneIds, created: shippingZones } = await seedZones(tx);
    return {
      shippingZones,
      shippingRates: await seedRates(tx, zoneIds),
      packagingProfiles: await seedPackagingProfile(tx),
      costSettings: await seedCostSettings(tx),
      masks: await seedMasks(tx),
    };
  });
}

async function seedZones(tx: Tx): Promise<{ zoneIds: ReadonlyMap<string, string>; created: number }> {
  const zoneIds = new Map<string, string>();
  let created = 0;
  for (const zone of SHIPPING_ZONES) {
    const existing = await tx.shippingZone.findUnique({ where: { code: zone.code } });
    const row = existing ?? (await tx.shippingZone.create({ data: { ...zone, countries: [...zone.countries] } }));
    if (!existing) created += 1;
    zoneIds.set(zone.code, row.id);
  }
  return { zoneIds, created };
}

async function seedRates(tx: Tx, zoneIds: ReadonlyMap<string, string>): Promise<number> {
  let created = 0;
  for (const { zoneCode, ...rate } of SHIPPING_RATES) {
    const zoneId = zoneIds.get(zoneCode);
    if (!zoneId) throw new Error(`La tarifa apunta a la zona ${zoneCode}, que no está en el seed`);

    const key = {
      zoneId,
      carrier: rate.carrier,
      service: rate.service,
      maxWeightKg: rate.maxWeightKg,
      validFrom: rate.validFrom,
    };
    if (await tx.shippingRate.findFirst({ where: key })) continue;
    await tx.shippingRate.create({ data: { ...rate, zoneId } });
    created += 1;
  }
  return created;
}

async function seedPackagingProfile(tx: Tx): Promise<number> {
  if (await tx.packagingProfile.findUnique({ where: { name: PACKAGING_PROFILE.name } })) return 0;
  await tx.packagingProfile.create({ data: PACKAGING_PROFILE });
  return 1;
}

// CostSettings es versionada: cualquier fila existente ya es la vigente, así que solo se carga en una tabla vacía.
async function seedCostSettings(tx: Tx): Promise<number> {
  if ((await tx.costSettings.count()) > 0) return 0;
  await tx.costSettings.create({ data: COST_SETTINGS });
  return 1;
}

async function seedMasks(tx: Tx): Promise<number> {
  let created = 0;
  for (const mask of MASKS) {
    if (await tx.mask.findUnique({ where: { slug: mask.slug } })) continue;
    await tx.mask.create({ data: mask });
    created += 1;
  }
  return created;
}
