import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { createPrismaPricingRepository } from "./pricing.js";

function fakeDb(box: { costGtq: Prisma.Decimal } | null) {
  const db = {
    costSettings: { findFirst: vi.fn(async () => ({ id: 2 })) },
    packagingProfile: { findUnique: vi.fn(async () => box) },
  };
  return { db, repository: createPrismaPricingRepository(db as unknown as PrismaClient) };
}

describe("createPrismaPricingRepository", () => {
  it("toma la CostSettings vigente (la de id más alto)", async () => {
    const { db, repository } = fakeDb(null);

    await repository.findSettings();

    expect(db.costSettings.findFirst).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { id: "desc" } }));
  });

  it("devuelve el costo de la caja o null si no existe", async () => {
    const found = fakeDb({ costGtq: new Prisma.Decimal("45.00") });
    const missing = fakeDb(null);

    expect((await found.repository.findPackagingCostGtq("p1"))?.toNumber()).toBe(45);
    expect(found.db.packagingProfile.findUnique).toHaveBeenCalledWith({ where: { id: "p1" }, select: { costGtq: true } });
    expect(await missing.repository.findPackagingCostGtq("p1")).toBeNull();
  });
});
