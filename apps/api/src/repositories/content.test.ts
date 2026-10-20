import { describe, expect, it, vi } from "vitest";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { createPrismaStoryRepository } from "./stories.js";
import { createPrismaVideoRepository } from "./videos.js";

const NOW = new Date("2026-10-19T12:00:00.000Z");
const PUBLISHED = { publishedAt: { not: null, lte: NOW } };
const PUBLIC_MASK = { slug: "jaguar-dorado", nameEs: "Jaguar Dorado", nameEn: "Golden Jaguar", status: "AVAILABLE" };
const MASK_LINK = { slug: "jaguar-dorado", name: { es: "Jaguar Dorado", en: "Golden Jaguar" } };

const STORY_ROW = {
  slug: "de-bloque-a-jaguar",
  titleEs: "De bloque a jaguar",
  titleEn: "From block to jaguar",
  coverR2Key: "stories/1.webp",
  publishedAt: new Date("2026-10-01T00:00:00.000Z"),
  mask: PUBLIC_MASK,
};

const VIDEO_FIELDS = {
  platform: "YOUTUBE",
  url: "https://www.youtube.com/watch?v=abc",
  externalId: "abc",
  title: "Tallando",
  thumbnailUrl: null,
  publishedAt: new Date("2026-10-02T00:00:00.000Z"),
};

function fakePrisma(table: "story" | "video", rows: { list?: unknown[]; total?: number; detail?: unknown } = {}) {
  const model = {
    findMany: vi.fn(async () => rows.list ?? []),
    count: vi.fn(async () => rows.total ?? 0),
    findFirst: vi.fn(async () => rows.detail ?? null),
  };
  const client = { [table]: model, $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)) };
  return { model, prisma: client as unknown as PrismaClient };
}

const firstArg = <T>(fn: ReturnType<typeof vi.fn>) => fn.mock.calls[0]?.[0 as never] as T;

describe("historias", () => {
  it("lista solo las publicadas, de la más reciente a la más vieja", async () => {
    const { prisma, model } = fakePrisma("story", { list: [STORY_ROW], total: 3 });

    const result = await createPrismaStoryRepository(prisma, () => NOW).list({ page: 2, limit: 2 });

    expect(result).toEqual({
      total: 3,
      items: [
        {
          slug: "de-bloque-a-jaguar",
          title: { es: "De bloque a jaguar", en: "From block to jaguar" },
          coverKey: "stories/1.webp",
          publishedAt: "2026-10-01T00:00:00.000Z",
          mask: MASK_LINK,
        },
      ],
    });
    expect(firstArg<Prisma.StoryFindManyArgs>(model.findMany)).toMatchObject({
      where: PUBLISHED,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: 2,
      take: 2,
    });
    expect(model.count).toHaveBeenCalledWith({ where: PUBLISHED });
  });

  it("no enlaza una máscara que sigue en borrador", async () => {
    const { prisma } = fakePrisma("story", { list: [{ ...STORY_ROW, mask: { ...PUBLIC_MASK, status: "DRAFT" } }] });

    const { items } = await createPrismaStoryRepository(prisma, () => NOW).list({ page: 1, limit: 24 });

    expect(items[0]?.mask).toBeNull();
  });

  it("busca el detalle por slug solo entre las publicadas, con cuerpo y videos", async () => {
    const detail = { ...STORY_ROW, mask: null, bodyEs: "<p>Hola</p>", bodyEn: "<p>Hi</p>", videos: [VIDEO_FIELDS] };
    const { prisma, model } = fakePrisma("story", { detail });

    const story = await createPrismaStoryRepository(prisma, () => NOW).findBySlug("de-bloque-a-jaguar");

    expect(firstArg<Prisma.StoryFindFirstArgs>(model.findFirst).where).toEqual({
      slug: "de-bloque-a-jaguar",
      ...PUBLISHED,
    });
    expect(story).toMatchObject({
      mask: null,
      body: { es: "<p>Hola</p>", en: "<p>Hi</p>" },
      videos: [{ ...VIDEO_FIELDS, publishedAt: "2026-10-02T00:00:00.000Z" }],
    });
  });

  it("falla si la base devuelve una historia sin fecha en vez de publicarla", async () => {
    const { prisma } = fakePrisma("story", { list: [{ ...STORY_ROW, publishedAt: null }] });

    await expect(createPrismaStoryRepository(prisma, () => NOW).list({ page: 1, limit: 24 })).rejects.toThrow(
      /sin publicar/,
    );
  });

  it("sin reloj inyectado compara con la hora actual", async () => {
    const { prisma, model } = fakePrisma("story");
    const before = Date.now();

    await createPrismaStoryRepository(prisma).list({ page: 1, limit: 24 });

    const where = firstArg<Prisma.StoryFindManyArgs>(model.findMany).where as { publishedAt: { lte: Date } };
    expect(where.publishedAt.lte.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("devuelve null si la historia no está publicada", async () => {
    const { prisma } = fakePrisma("story");

    expect(await createPrismaStoryRepository(prisma, () => NOW).findBySlug("futura")).toBeNull();
  });
});

describe("videos", () => {
  const VIDEO_ROW = {
    id: "v1",
    ...VIDEO_FIELDS,
    mask: PUBLIC_MASK,
    story: { slug: "de-bloque-a-jaguar", titleEs: "De bloque", titleEn: "From block", publishedAt: STORY_ROW.publishedAt },
  };

  it("lista todos sin filtro y convierte la fila", async () => {
    const { prisma, model } = fakePrisma("video", { list: [VIDEO_ROW], total: 1 });

    const result = await createPrismaVideoRepository(prisma, () => NOW).list({ page: 1, limit: 24 });

    expect(result.items).toEqual([
      {
        id: "v1",
        ...VIDEO_FIELDS,
        publishedAt: "2026-10-02T00:00:00.000Z",
        mask: MASK_LINK,
        story: { slug: "de-bloque-a-jaguar", title: { es: "De bloque", en: "From block" } },
      },
    ]);
    expect(firstArg<Prisma.VideoFindManyArgs>(model.findMany)).toMatchObject({
      where: {},
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  });

  it("sin reloj inyectado enlaza las historias ya publicadas", async () => {
    const { prisma } = fakePrisma("video", { list: [VIDEO_ROW], total: 1 });

    const { items } = await createPrismaVideoRepository(prisma).list({ page: 1, limit: 24 });

    expect(items[0]?.story?.slug).toBe("de-bloque-a-jaguar");
  });

  it("con maskId solo filtra máscaras públicas", async () => {
    const { prisma, model } = fakePrisma("video");

    await createPrismaVideoRepository(prisma, () => NOW).list({ maskId: "m1", page: 1, limit: 24 });

    expect(firstArg<Prisma.VideoFindManyArgs>(model.findMany).where).toEqual({
      maskId: "m1",
      mask: { is: { status: { not: "DRAFT" } } },
    });
  });

  it("oculta la máscara en borrador y la historia que aún no se publica", async () => {
    const future = new Date("2026-12-01T00:00:00.000Z");
    const row = {
      ...VIDEO_ROW,
      mask: { ...PUBLIC_MASK, status: "DRAFT" },
      story: { ...VIDEO_ROW.story, publishedAt: future },
    };
    const { prisma } = fakePrisma("video", { list: [row, { ...VIDEO_ROW, mask: null, story: null }] });

    const { items } = await createPrismaVideoRepository(prisma, () => NOW).list({ page: 1, limit: 24 });

    expect(items.map(({ mask, story }) => ({ mask, story }))).toEqual([
      { mask: null, story: null },
      { mask: null, story: null },
    ]);
  });
});
