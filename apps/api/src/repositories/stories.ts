import type { StoryDetailDto, StorySummaryDto } from "@sc-art-studio/shared";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { MASK_LINK_SELECT, VIDEO_EMBED_SELECT, latestFirst, publishedBy, toMaskLink, toVideoEmbed } from "./links.js";

export interface PageQuery {
  page: number;
  limit: number;
}

export interface StoryRepository {
  list(query: PageQuery): Promise<{ items: StorySummaryDto[]; total: number }>;
  /** null si no existe o si aún no se publica. */
  findBySlug(slug: string): Promise<StoryDetailDto | null>;
}

const SUMMARY_SELECT = {
  slug: true,
  titleEs: true,
  titleEn: true,
  coverR2Key: true,
  publishedAt: true,
  mask: { select: MASK_LINK_SELECT },
} satisfies Prisma.StorySelect;

const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  bodyEs: true,
  bodyEn: true,
  videos: { select: VIDEO_EMBED_SELECT, orderBy: latestFirst() },
} satisfies Prisma.StorySelect;

type SummaryRow = Prisma.StoryGetPayload<{ select: typeof SUMMARY_SELECT }>;
type DetailRow = Prisma.StoryGetPayload<{ select: typeof DETAIL_SELECT }>;

function toSummary(row: SummaryRow): StorySummaryDto {
  // El `where` exige fecha; si faltara, la consulta cambió y es mejor fallar que publicarla.
  if (!row.publishedAt) throw new Error("La consulta pública devolvió una historia sin publicar");
  return {
    slug: row.slug,
    title: { es: row.titleEs, en: row.titleEn },
    coverKey: row.coverR2Key,
    publishedAt: row.publishedAt.toISOString(),
    mask: toMaskLink(row.mask),
  };
}

function toDetail(row: DetailRow): StoryDetailDto {
  return {
    ...toSummary(row),
    body: { es: row.bodyEs, en: row.bodyEn },
    videos: row.videos.map(toVideoEmbed),
  };
}

export function createPrismaStoryRepository(prisma: PrismaClient, now: () => Date = () => new Date()): StoryRepository {
  return {
    async list({ page, limit }) {
      const where = publishedBy(now());
      const [rows, total] = await prisma.$transaction([
        prisma.story.findMany({
          where,
          select: SUMMARY_SELECT,
          orderBy: latestFirst(),
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.story.count({ where }),
      ]);
      return { items: rows.map(toSummary), total };
    },

    async findBySlug(slug) {
      const row = await prisma.story.findFirst({ where: { slug, ...publishedBy(now()) }, select: DETAIL_SELECT });
      return row ? toDetail(row) : null;
    },
  };
}
