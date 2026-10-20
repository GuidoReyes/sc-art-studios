import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { MASKS, SHIPPING_RATES, SHIPPING_ZONES } from "./data.js";
import { seedDatabase } from "./seed.js";

type Row = Record<string, unknown> & { id: string };

// Cliente en memoria con solo lo que usa el seed; compara `where` campo por campo.
function fakeTable() {
  const rows: Row[] = [];
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) =>
      value instanceof Date ? (row[key] as Date).getTime() === value.getTime() : row[key] === value,
    );
  return {
    rows,
    findUnique: async ({ where }: { where: Record<string, unknown> }) => rows.find((r) => matches(r, where)) ?? null,
    findFirst: async ({ where }: { where: Record<string, unknown> }) => rows.find((r) => matches(r, where)) ?? null,
    count: async () => rows.length,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `id-${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    },
  };
}

type FakeTable = ReturnType<typeof fakeTable>;

interface FakePrisma {
  shippingZone: FakeTable;
  shippingRate: FakeTable;
  packagingProfile: FakeTable;
  costSettings: FakeTable;
  mask: FakeTable;
  $transaction: <T>(fn: (tx: FakePrisma) => Promise<T>) => Promise<T>;
}

function fakePrisma(): FakePrisma {
  const client: FakePrisma = {
    shippingZone: fakeTable(),
    shippingRate: fakeTable(),
    packagingProfile: fakeTable(),
    costSettings: fakeTable(),
    mask: fakeTable(),
    $transaction: async (fn) => fn(client),
  };
  return client;
}

const asPrisma = (fake: FakePrisma) => fake as unknown as PrismaClient;

describe("seedDatabase", () => {
  it("carga zonas, tarifas, empaque, costos y máscaras en una base vacía", async () => {
    const fake = fakePrisma();

    const summary = await seedDatabase(asPrisma(fake));

    expect(summary).toEqual({
      shippingZones: SHIPPING_ZONES.length,
      shippingRates: SHIPPING_RATES.length,
      packagingProfiles: 1,
      costSettings: 1,
      masks: MASKS.length,
    });
    expect(fake.mask.rows.every((mask) => mask.status === "DRAFT")).toBe(true);
  });

  it("enlaza cada tarifa con el id de su zona", async () => {
    const fake = fakePrisma();
    await seedDatabase(asPrisma(fake));

    const zoneC = fake.shippingZone.rows.find((zone) => zone.code === "FEDEX-C");
    const ratesC = fake.shippingRate.rows.filter((rate) => rate.zoneId === zoneC?.id);
    expect(ratesC).toHaveLength(SHIPPING_RATES.filter((rate) => rate.zoneCode === "FEDEX-C").length);
    expect(fake.shippingRate.rows[0]).not.toHaveProperty("zoneCode");
  });

  it("al repetirse no duplica nada", async () => {
    const fake = fakePrisma();
    await seedDatabase(asPrisma(fake));

    const second = await seedDatabase(asPrisma(fake));

    expect(second).toEqual({ shippingZones: 0, shippingRates: 0, packagingProfiles: 0, costSettings: 0, masks: 0 });
    expect(fake.shippingRate.rows).toHaveLength(SHIPPING_RATES.length);
  });

  it("no pisa los costos ni las máscaras que ya se editaron en el admin", async () => {
    const fake = fakePrisma();
    await fake.costSettings.create({ data: { fxUsdGtq: "7.8000" } });
    await fake.mask.create({ data: { slug: "jaguar-dorado", nameEs: "Jaguar editado", status: "AVAILABLE" } });

    const summary = await seedDatabase(asPrisma(fake));

    expect(summary.costSettings).toBe(0);
    expect(summary.masks).toBe(MASKS.length - 1);
    expect(fake.costSettings.rows).toEqual([expect.objectContaining({ fxUsdGtq: "7.8000" })]);
    expect(fake.mask.rows.find((mask) => mask.slug === "jaguar-dorado")).toMatchObject({
      nameEs: "Jaguar editado",
      status: "AVAILABLE",
    });
  });
});
