// Qué le piden a Prisma las operaciones de máscaras, historias y videos.
import { describe, expect, it, vi } from "vitest";
import type { AdminMaskDto } from "@sc-art-studio/shared";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { assertMaskDeletable, maskOps } from "./masks.js";
import { storyOps } from "./stories.js";
import { videoOps } from "./videos.js";

const AT = new Date("2026-10-20T12:00:00.000Z");
const decimal = (value: number) => ({ toNumber: () => value });

function delegate(row: object) {
  return {
    findMany: vi.fn(async () => [row]),
    count: vi.fn(async () => 1),
    findUnique: vi.fn(async (): Promise<object | null> => row),
    create: vi.fn(async () => row),
    update: vi.fn(async () => row),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  };
}

function fakeDb(rows: { mask?: object; story?: object; video?: object }) {
  const db = {
    mask: delegate(rows.mask ?? {}),
    story: delegate(rows.story ?? {}),
    video: delegate(rows.video ?? {}),
    $transaction: vi.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
  };
  return { db, client: db as unknown as PrismaClient, tx: db as unknown as Prisma.TransactionClient };
}

const MASK_ROW = {
  id: "m1",
  slug: "jaguar",
  status: "DRAFT",
  priceUsd: decimal(245.5),
  lengthCm: null,
  shopifyProductId: null,
  createdAt: AT,
  updatedAt: AT,
};

describe("maskOps", () => {
  it("lista con borradores, filtro de estado y lo editado primero", async () => {
    const { db, client } = fakeDb({ mask: MASK_ROW });

    const page = await maskOps.list(client, { status: "DRAFT", page: 2, limit: 10 });

    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ id: "m1", priceUsd: 245.5, createdAt: AT.toISOString() });
    expect(db.mask.findMany).toHaveBeenCalledWith({ where: { status: "DRAFT" }, orderBy: { updatedAt: "desc" }, skip: 10, take: 10 });
    expect(db.mask.count).toHaveBeenCalledWith({ where: { status: "DRAFT" } });
  });

  it("sin filtro lista todo", async () => {
    const { db, client } = fakeDb({ mask: MASK_ROW });

    await maskOps.list(client, { page: 1, limit: 5 });

    expect(db.mask.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, skip: 0 }));
  });

  it("busca, crea y actualiza por id", async () => {
    const { db, client, tx } = fakeDb({ mask: MASK_ROW });

    await maskOps.find(client, "m1");
    await maskOps.insert(tx, { slug: "a", nameEs: "a", nameEn: "a", animal: "a", descriptionEs: "a", descriptionEn: "a" });
    await maskOps.patch(tx, "m1", { featured: true });

    expect(db.mask.findUnique).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(db.mask.create).toHaveBeenCalledWith({ data: expect.objectContaining({ slug: "a" }) });
    expect(db.mask.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { featured: true } });
  });

  it("find devuelve null si no existe", async () => {
    const { db, client } = fakeDb({ mask: MASK_ROW });
    db.mask.findUnique.mockResolvedValueOnce(null);

    expect(await maskOps.find(client, "m1")).toBeNull();
  });

  it("borra solo si sigue sin venderse ni publicarse (condición en el WHERE)", async () => {
    const { db, tx } = fakeDb({ mask: MASK_ROW });

    expect(await maskOps.delete(tx, "m1")).toBe(1);
    expect(db.mask.deleteMany).toHaveBeenCalledWith({
      where: { id: "m1", status: { notIn: ["SOLD", "RESERVED"] }, shopifyProductId: null },
    });
  });

  it.each([
    [{ status: "SOLD" }, "MASK_SOLD"],
    [{ status: "RESERVED" }, "MASK_RESERVED"],
    [{ status: "AVAILABLE", shopifyProductId: "gid://shopify/Product/1" }, "MASK_IN_SHOPIFY"],
  ] as const)("no deja borrar %o", (mask, code) => {
    expect(() => assertMaskDeletable({ shopifyProductId: null, ...mask } as AdminMaskDto)).toThrow(
      expect.objectContaining({ status: 409, code }),
    );
  });

  it("un borrador sin Shopify sí se puede borrar", () => {
    expect(() => assertMaskDeletable({ status: "DRAFT", shopifyProductId: null } as AdminMaskDto)).not.toThrow();
  });
});

describe("storyOps", () => {
  const STORY_ROW = { id: "s1", slug: "historia", publishedAt: null, createdAt: AT, updatedAt: AT };

  it("lista todas, publicadas o no", async () => {
    const { db, client } = fakeDb({ story: STORY_ROW });

    const page = await storyOps.list(client, { page: 1, limit: 24 });

    expect(page.items[0]).toMatchObject({ id: "s1", publishedAt: null, updatedAt: AT.toISOString() });
    expect(db.story.findMany).toHaveBeenCalledWith({ orderBy: { updatedAt: "desc" }, skip: 0, take: 24 });
  });

  it("busca, crea, actualiza y borra", async () => {
    const { db, client, tx } = fakeDb({ story: STORY_ROW });
    db.story.findUnique.mockResolvedValueOnce(null);

    expect(await storyOps.find(client, "s1")).toBeNull();
    await storyOps.insert(tx, { slug: "h", titleEs: "h", titleEn: "h", bodyEs: "<p>h</p>", bodyEn: "<p>h</p>" });
    await storyOps.patch(tx, "s1", { publishedAt: AT });
    expect(await storyOps.delete(tx, "s1")).toBe(1);

    expect(db.story.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { publishedAt: AT } });
    expect(db.story.deleteMany).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(await storyOps.find(client, "s1")).toMatchObject({ id: "s1" });
  });
});

describe("videoOps", () => {
  const VIDEO_ROW = { id: "v1", platform: "YOUTUBE", source: "MANUAL", createdAt: AT, updatedAt: AT };

  it("filtra por máscara e historia", async () => {
    const { db, client } = fakeDb({ video: VIDEO_ROW });

    await videoOps.list(client, { maskId: "m1", storyId: "s1", page: 1, limit: 10 });
    await videoOps.list(client, { page: 1, limit: 10 });

    expect(db.video.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { maskId: "m1", storyId: "s1" } }));
    expect(db.video.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: {} }));
  });

  it("lo que agrega el admin siempre es MANUAL", async () => {
    const { db, client, tx } = fakeDb({ video: VIDEO_ROW });

    await videoOps.insert(tx, { platform: "YOUTUBE", externalId: "dQw4w9WgXcQ", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "t" });
    await videoOps.patch(tx, "v1", { title: "otro" });
    await videoOps.delete(tx, "v1");

    expect(db.video.create).toHaveBeenCalledWith({ data: expect.objectContaining({ source: "MANUAL" }) });
    expect(db.video.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { title: "otro" } });
    expect(db.video.deleteMany).toHaveBeenCalledWith({ where: { id: "v1" } });
    expect(await videoOps.find(client, "v1")).toMatchObject({ id: "v1" });
    db.video.findUnique.mockResolvedValueOnce(null);
    expect(await videoOps.find(client, "v1")).toBeNull();
  });
});
