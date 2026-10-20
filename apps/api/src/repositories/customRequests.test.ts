import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createPrismaCustomRequestRepository } from "./customRequests.js";

describe("createPrismaCustomRequestRepository", () => {
  it("crea el encargo como NEW y solo lee de vuelta el id", async () => {
    const create = vi.fn(async () => ({ id: "cr_1" }));
    const prisma = { customRequest: { create } } as unknown as PrismaClient;
    const input = { name: "Emily", email: "emily@example.com", country: "US", idea: "Una máscara de quetzal" };

    const result = await createPrismaCustomRequestRepository(prisma).create(input);

    expect(result).toEqual({ id: "cr_1" });
    expect(create).toHaveBeenCalledWith({ data: { ...input, status: "NEW" }, select: { id: true } });
  });
});
