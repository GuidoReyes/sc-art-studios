import type { MaskDetailDto, MaskImageDto, MaskSummaryDto, PublicMaskStatus } from "@sc-art-studio/shared";
import type { MaskStatus, Prisma, PrismaClient } from "../generated/prisma/client.js";

export interface MaskListQuery {
  status?: PublicMaskStatus;
  animal?: string;
  page: number;
  limit: number;
}

export interface MaskRepository {
  list(query: MaskListQuery): Promise<{ items: MaskSummaryDto[]; total: number }>;
  /** null si no existe o si es borrador: para el público son lo mismo. */
  findBySlug(slug: string): Promise<MaskDetailDto | null>;
}

// Un borrador nunca sale por la API pública, aunque alguien pida su slug.
export function buildMaskWhere({ status, animal }: MaskListQuery): Prisma.MaskWhereInput {
  return {
    status: status ?? { not: "DRAFT" },
    ...(animal ? { animal } : {}),
  };
}

// `select` explícito: los costos internos (materiales, horas, empaque) ni siquiera se leen.
const IMAGE_SELECT = { r2Key: true, altEs: true, altEn: true, sortOrder: true } satisfies Prisma.MaskImageSelect;

const SUMMARY_SELECT = {
  id: true,
  slug: true,
  nameEs: true,
  nameEn: true,
  animal: true,
  status: true,
  priceUsd: true,
  priceGtq: true,
  featured: true,
  publishedAt: true,
  shopifyProductId: true,
  images: { select: IMAGE_SELECT, orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.MaskSelect;

function detailSelect(now: Date) {
  return {
    ...SUMMARY_SELECT,
    descriptionEs: true,
    descriptionEn: true,
    storyEs: true,
    storyEn: true,
    shopifyVariantId: true,
    weightGrams: true,
    lengthCm: true,
    widthCm: true,
    heightCm: true,
    images: { select: IMAGE_SELECT, orderBy: { sortOrder: "asc" } },
    videos: {
      select: { platform: true, url: true, externalId: true, title: true, thumbnailUrl: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    },
    stories: {
      select: { slug: true, titleEs: true, titleEn: true },
      where: { publishedAt: { not: null, lte: now } },
      orderBy: { publishedAt: "desc" },
    },
  } satisfies Prisma.MaskSelect;
}

type SummaryRow = Prisma.MaskGetPayload<{ select: typeof SUMMARY_SELECT }>;
type DetailRow = Prisma.MaskGetPayload<{ select: ReturnType<typeof detailSelect> }>;
type ImageRow = SummaryRow["images"][number];

const ORDER_BY = [{ publishedAt: "desc" }, { createdAt: "desc" }] satisfies Prisma.MaskOrderByWithRelationInput[];

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function toPublicStatus(status: MaskStatus): PublicMaskStatus {
  // El `where` ya lo excluye; si llega aquí, algo cambió en la consulta y es mejor fallar que publicarlo.
  if (status === "DRAFT") throw new Error("La consulta pública devolvió un borrador");
  return status;
}

function toImage({ r2Key, altEs, altEn, sortOrder }: ImageRow): MaskImageDto {
  return { key: r2Key, alt: { es: altEs, en: altEn }, sortOrder };
}

function toSummary(row: SummaryRow): MaskSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    name: { es: row.nameEs, en: row.nameEn },
    animal: row.animal,
    status: toPublicStatus(row.status),
    priceUsd: toNumber(row.priceUsd),
    priceGtq: toNumber(row.priceGtq),
    featured: row.featured,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    shopifyProductId: row.shopifyProductId,
    image: row.images[0] ? toImage(row.images[0]) : null,
  };
}

function toDetail(row: DetailRow): MaskDetailDto {
  const { image: _firstImage, ...summary } = toSummary(row);
  const [length, width, height] = [row.lengthCm, row.widthCm, row.heightCm].map(toNumber);
  return {
    ...summary,
    description: { es: row.descriptionEs, en: row.descriptionEn },
    story: row.storyEs !== null && row.storyEn !== null ? { es: row.storyEs, en: row.storyEn } : null,
    shopifyVariantId: row.shopifyVariantId,
    weightGrams: row.weightGrams,
    dimensionsCm: length != null && width != null && height != null ? { length, width, height } : null,
    images: row.images.map(toImage),
    videos: row.videos.map((video) => ({ ...video, publishedAt: video.publishedAt?.toISOString() ?? null })),
    stories: row.stories.map(({ slug, titleEs, titleEn }) => ({ slug, title: { es: titleEs, en: titleEn } })),
  };
}

export function createPrismaMaskRepository(prisma: PrismaClient, now: () => Date = () => new Date()): MaskRepository {
  return {
    async list(query) {
      const where = buildMaskWhere(query);
      const [rows, total] = await prisma.$transaction([
        prisma.mask.findMany({
          where,
          select: SUMMARY_SELECT,
          orderBy: ORDER_BY,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.mask.count({ where }),
      ]);
      return { items: rows.map(toSummary), total };
    },

    async findBySlug(slug) {
      const row = await prisma.mask.findFirst({
        where: { slug, status: { not: "DRAFT" } },
        select: detailSelect(now()),
      });
      return row ? toDetail(row) : null;
    },
  };
}
