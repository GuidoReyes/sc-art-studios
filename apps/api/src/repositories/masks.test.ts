import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { buildMaskWhere, createPrismaMaskRepository } from "./masks.js";

const NOW = new Date("2026-10-19T12:00:00.000Z");
const COST_FIELDS = ["materialsCostGtq", "laborHours", "packagingProfileId", "packagingProfile"];

const IMAGE = { r2Key: "masks/jaguar/1.webp", altEs: "Jaguar de frente", altEn: "Jaguar, front view", sortOrder: 0 };

const SUMMARY_ROW = {
  id: "m1",
  slug: "jaguar-dorado",
  nameEs: "Jaguar Dorado",
  nameEn: "Golden Jaguar",
  animal: "Jaguar",
  status: "AVAILABLE",
  priceUsd: new Prisma.Decimal("95.00"),
  priceGtq: null,
  featured: true,
  publishedAt: new Date("2026-10-01T00:00:00.000Z"),
  shopifyProductId: "gid://shopify/Product/1",
  images: [IMAGE],
};

const DETAIL_ROW = {
  ...SUMMARY_ROW,
  descriptionEs: "Tallada en madera",
  descriptionEn: "Carved wood",
  storyEs: null,
  storyEn: null,
  shopifyVariantId: "gid://shopify/ProductVariant/1",
  weightGrams: 650,
  lengthCm: new Prisma.Decimal("22.5"),
  widthCm: new Prisma.Decimal("15.0"),
  heightCm: new Prisma.Decimal("9.0"),
  videos: [
    {
      platform: "TIKTOK",
      url: "https://www.tiktok.com/@marca/video/1",
      externalId: "1",
      title: "Pintando el jaguar",
      thumbnailUrl: null,
      publishedAt: null,
    },
  ],
  stories: [{ slug: "de-bloque-a-jaguar", titleEs: "De bloque a jaguar", titleEn: "From block to jaguar" }],
};

function fakePrisma(rows: { list?: unknown[]; total?: number; detail?: unknown } = {}) {
  const mask = {
    findMany: vi.fn(async () => rows.list ?? []),
    count: vi.fn(async () => rows.total ?? 0),
    findFirst: vi.fn(async () => rows.detail ?? null),
  };
  const client = { mask, $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)) };
  return { client, mask, prisma: client as unknown as PrismaClient };
}

describe("buildMaskWhere", () => {
  it("sin filtros excluye los borradores", () => {
    expect(buildMaskWhere({ page: 1, limit: 24 })).toEqual({ status: { not: "DRAFT" } });
  });

  it("con estado y animal filtra por ambos", () => {
    expect(buildMaskWhere({ status: "SOLD", animal: "Jaguar", page: 1, limit: 24 })).toEqual({
      status: "SOLD",
      animal: "Jaguar",
    });
  });
});

describe("list", () => {
  it("pagina, ordena por publicación y convierte la fila al DTO", async () => {
    const { prisma, mask } = fakePrisma({ list: [SUMMARY_ROW], total: 7 });

    const result = await createPrismaMaskRepository(prisma).list({ page: 2, limit: 6 });

    expect(result).toEqual({
      total: 7,
      items: [
        {
          id: "m1",
          slug: "jaguar-dorado",
          name: { es: "Jaguar Dorado", en: "Golden Jaguar" },
          animal: "Jaguar",
          status: "AVAILABLE",
          priceUsd: 95,
          priceGtq: null,
          featured: true,
          publishedAt: "2026-10-01T00:00:00.000Z",
          shopifyProductId: "gid://shopify/Product/1",
          image: { key: IMAGE.r2Key, alt: { es: IMAGE.altEs, en: IMAGE.altEn }, sortOrder: 0 },
        },
      ],
    });
    const args = mask.findMany.mock.calls[0]?.[0 as never] as Prisma.MaskFindManyArgs;
    expect(args).toMatchObject({
      where: { status: { not: "DRAFT" } },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: 6,
      take: 6,
    });
    expect(mask.count).toHaveBeenCalledWith({ where: { status: { not: "DRAFT" } } });
  });

  it("nunca pide a la base los campos de costo", async () => {
    const { prisma, mask } = fakePrisma();

    await createPrismaMaskRepository(prisma).list({ page: 1, limit: 24 });

    const select = (mask.findMany.mock.calls[0]?.[0 as never] as Prisma.MaskFindManyArgs).select ?? {};
    for (const field of COST_FIELDS) expect(select).not.toHaveProperty(field);
  });

  it("una máscara sin fotos queda con image null", async () => {
    const { prisma } = fakePrisma({ list: [{ ...SUMMARY_ROW, images: [] }], total: 1 });

    const { items } = await createPrismaMaskRepository(prisma).list({ page: 1, limit: 24 });

    expect(items[0]?.image).toBeNull();
  });

  it("falla si la base devuelve un borrador en vez de publicarlo", async () => {
    const { prisma } = fakePrisma({ list: [{ ...SUMMARY_ROW, status: "DRAFT" }], total: 1 });

    await expect(createPrismaMaskRepository(prisma).list({ page: 1, limit: 24 })).rejects.toThrow(/borrador/);
  });
});

describe("findBySlug", () => {
  it("busca por slug sin borradores y solo con historias ya publicadas", async () => {
    const { prisma, mask } = fakePrisma();

    expect(await createPrismaMaskRepository(prisma, () => NOW).findBySlug("lobo-florido")).toBeNull();

    const args = mask.findFirst.mock.calls[0]?.[0 as never] as Prisma.MaskFindFirstArgs;
    expect(args.where).toEqual({ slug: "lobo-florido", status: { not: "DRAFT" } });
    expect(args.select?.stories).toMatchObject({ where: { publishedAt: { not: null, lte: NOW } } });
    for (const field of COST_FIELDS) expect(args.select).not.toHaveProperty(field);
  });

  it("convierte el detalle con fotos, videos, historias y medidas", async () => {
    const { prisma } = fakePrisma({ detail: DETAIL_ROW });

    const detail = await createPrismaMaskRepository(prisma, () => NOW).findBySlug("jaguar-dorado");

    expect(detail).toMatchObject({
      slug: "jaguar-dorado",
      description: { es: "Tallada en madera", en: "Carved wood" },
      story: null,
      shopifyVariantId: "gid://shopify/ProductVariant/1",
      weightGrams: 650,
      dimensionsCm: { length: 22.5, width: 15, height: 9 },
      images: [{ key: IMAGE.r2Key, alt: { es: IMAGE.altEs, en: IMAGE.altEn }, sortOrder: 0 }],
      videos: [DETAIL_ROW.videos[0]],
      stories: [{ slug: "de-bloque-a-jaguar", title: { es: "De bloque a jaguar", en: "From block to jaguar" } }],
    });
    expect(detail).not.toHaveProperty("image");
  });

  it("incluye la historia corta y deja medidas en null si falta alguna", async () => {
    const { prisma } = fakePrisma({
      detail: { ...DETAIL_ROW, storyEs: "Nació en el taller", storyEn: "Born in the workshop", heightCm: null },
    });

    const detail = await createPrismaMaskRepository(prisma).findBySlug("jaguar-dorado");

    expect(detail?.story).toEqual({ es: "Nació en el taller", en: "Born in the workshop" });
    expect(detail?.dimensionsCm).toBeNull();
  });
});
