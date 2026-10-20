import type { StoryLinkDto, VideoDto } from "@sc-art-studio/shared";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { MASK_LINK_SELECT, VIDEO_EMBED_SELECT, latestFirst, toMaskLink, toVideoEmbed } from "./links.js";
import type { PageQuery } from "./stories.js";

export interface VideoListQuery extends PageQuery {
  maskId?: string;
}

export interface VideoRepository {
  list(query: VideoListQuery): Promise<{ items: VideoDto[]; total: number }>;
}

const VIDEO_SELECT = {
  id: true,
  ...VIDEO_EMBED_SELECT,
  mask: { select: MASK_LINK_SELECT },
  story: { select: { slug: true, titleEs: true, titleEn: true, publishedAt: true } },
} satisfies Prisma.VideoSelect;

type VideoRow = Prisma.VideoGetPayload<{ select: typeof VIDEO_SELECT }>;

// Los videos ya son públicos en las redes; lo que se protege es a qué máscara o historia enlazan.
// Filtrar por el id de un borrador devuelve vacío, como si no existiera.
function buildVideoWhere({ maskId }: VideoListQuery): Prisma.VideoWhereInput {
  return maskId ? { maskId, mask: { is: { status: { not: "DRAFT" } } } } : {};
}

function toStoryLink(story: VideoRow["story"], now: Date): StoryLinkDto | null {
  if (!story?.publishedAt || story.publishedAt > now) return null;
  return { slug: story.slug, title: { es: story.titleEs, en: story.titleEn } };
}

export function createPrismaVideoRepository(prisma: PrismaClient, now: () => Date = () => new Date()): VideoRepository {
  return {
    async list(query) {
      const where = buildVideoWhere(query);
      const [rows, total] = await prisma.$transaction([
        prisma.video.findMany({
          where,
          select: VIDEO_SELECT,
          orderBy: latestFirst(),
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.video.count({ where }),
      ]);
      const current = now();
      const items = rows.map(({ id, mask, story, ...embed }) => ({
        id,
        ...toVideoEmbed(embed),
        mask: toMaskLink(mask),
        story: toStoryLink(story, current),
      }));
      return { items, total };
    },
  };
}
