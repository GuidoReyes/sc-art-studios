import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpErrors.js";
import { type EntityOps, changedFields, createAdminStore, toPlain } from "./store.js";

interface Thing {
  id: string;
  name: string;
  updatedAt: string;
}

const ACTOR = { userId: "u1", ip: "203.0.113.5" };
const THING: Thing = { id: "t1", name: "Jaguar", updatedAt: "2026-10-20T00:00:00.000Z" };

const prismaError = (code: string) => Object.assign(new Error(code), { code });

function setup(overrides: Partial<EntityOps<Thing, { name: string }, { name?: string }, { page: number; limit: number }>> = {}) {
  const tx = { auditLog: { create: vi.fn(async () => ({})) } };
  const prisma = { $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) };
  const ops: EntityOps<Thing, { name: string }, { name?: string }, { page: number; limit: number }> = {
    entity: "Mask",
    action: "mask",
    duplicateMessage: "Ya existe",
    list: vi.fn(async () => ({ items: [THING], total: 1 })),
    find: vi.fn(async () => THING),
    insert: vi.fn(async (_tx, input) => ({ ...THING, ...input })),
    patch: vi.fn(async (_tx, _id, input) => ({ ...THING, ...input, updatedAt: "2026-10-21T00:00:00.000Z" })),
    delete: vi.fn(async () => 1),
    ...overrides,
  };
  const store = createAdminStore(prisma as unknown as PrismaClient, ops);
  return { tx, ops, store };
}

describe("toPlain y changedFields", () => {
  it("convierte Decimal y Date para JSON y deja lo demás igual", () => {
    const decimal = { toNumber: () => 12.5 };

    expect(toPlain({ a: new Date("2026-10-20T00:00:00.000Z"), b: decimal, c: null, d: "x" })).toEqual({
      a: "2026-10-20T00:00:00.000Z",
      b: 12.5,
      c: null,
      d: "x",
    });
  });

  it("solo incluye lo que cambió y nunca updatedAt", () => {
    expect(changedFields({ a: 1, b: "x", updatedAt: "1" }, { a: 2, b: "x", updatedAt: "2" })).toEqual({
      before: { a: 1 },
      after: { a: 2 },
    });
  });
});

describe("createAdminStore", () => {
  it("crea y audita en la misma transacción", async () => {
    const { tx, store } = setup();

    const created = await store.create({ name: "Lobo" }, ACTOR);

    expect(created.name).toBe("Lobo");
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: { userId: "u1", ip: "203.0.113.5", action: "mask.create", entity: "Mask", entityId: "t1", diff: { after: created } },
    });
  });

  it("al actualizar audita antes y después solo de lo que cambió", async () => {
    const { tx, store } = setup();

    await store.update("t1", { name: "Lobo" }, ACTOR);

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "mask.update", diff: { before: { name: "Jaguar" }, after: { name: "Lobo" } } }),
    });
  });

  it("un cambio que deja todo igual no ensucia la auditoría", async () => {
    const { tx, store } = setup();

    await store.update("t1", { name: "Jaguar" }, ACTOR);

    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("actualizar o borrar algo inexistente devuelve null/false sin auditar", async () => {
    const { tx, store, ops } = setup({ find: vi.fn(async () => null) });

    expect(await store.update("t1", { name: "x" }, ACTOR)).toBeNull();
    expect(await store.remove("t1", ACTOR)).toBe(false);
    expect(ops.patch).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("si la fila desaparece a mitad del update (P2025) es un 404", async () => {
    const { store } = setup({ patch: vi.fn(async () => Promise.reject(prismaError("P2025"))) });

    expect(await store.update("t1", { name: "x" }, ACTOR)).toBeNull();
  });

  it.each([
    ["P2002", 409, "DUPLICATE"],
    ["P2003", 422, "INVALID_REFERENCE"],
  ])("traduce %s a %i", async (code, status, errorCode) => {
    const { store } = setup({ insert: vi.fn(async () => Promise.reject(prismaError(code))) });

    await expect(store.create({ name: "x" }, ACTOR)).rejects.toMatchObject({ status, code: errorCode });
  });

  it("otros errores siguen su camino (500)", async () => {
    const boom = new Error("caída");
    const { store } = setup({ patch: vi.fn(async () => Promise.reject(boom)) });

    await expect(store.update("t1", { name: "x" }, ACTOR)).rejects.toBe(boom);
  });

  it("borra y audita el estado anterior completo", async () => {
    const { tx, store } = setup();

    expect(await store.remove("t1", ACTOR)).toBe(true);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "mask.delete", entityId: "t1", diff: { before: THING } }),
    });
  });

  it("respeta las reglas de negocio antes de borrar", async () => {
    const blocked = new HttpError(409, "No", "MASK_SOLD");
    const { store, ops } = setup({
      assertDeletable: () => {
        throw blocked;
      },
    });

    await expect(store.remove("t1", ACTOR)).rejects.toBe(blocked);
    expect(ops.delete).not.toHaveBeenCalled();
  });

  it("si otra petición la cambió entre leer y borrar, 409 sin auditar", async () => {
    const { tx, store } = setup({ delete: vi.fn(async () => 0) });

    await expect(store.remove("t1", ACTOR)).rejects.toMatchObject({ status: 409, code: "CHANGED" });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("listar y ver no abren transacción", async () => {
    const { store, ops } = setup();

    expect(await store.list({ page: 1, limit: 10 })).toEqual({ items: [THING], total: 1 });
    expect(await store.get("t1")).toEqual(THING);
    expect(ops.list).toHaveBeenCalled();
  });
});
