// Contrato de GET /api/stories, /api/stories/:slug y /api/videos (PRD §4.5). Solo tipos.
import type { LocalizedText, MaskStoryLinkDto, MaskVideoDto, PageMeta } from "./masks.js";

/** Enlace a una máscara pública; null si la máscara es borrador o no hay. */
export interface MaskLinkDto {
  slug: string;
  name: LocalizedText;
}

export type StoryLinkDto = MaskStoryLinkDto;

export interface StorySummaryDto {
  slug: string;
  title: LocalizedText;
  /** Llave de la portada en R2. */
  coverKey: string | null;
  /** ISO 8601; siempre en el pasado: solo se listan historias publicadas. */
  publishedAt: string;
  mask: MaskLinkDto | null;
}

export interface StoryDetailDto extends StorySummaryDto {
  /** HTML ya sanitizado al guardarse (sanitize-html en el admin). */
  body: LocalizedText;
  videos: MaskVideoDto[];
}

export interface VideoDto extends MaskVideoDto {
  id: string;
  mask: MaskLinkDto | null;
  /** null si la historia aún no se publica. */
  story: StoryLinkDto | null;
}

export interface ListResponse<T> {
  data: T[];
  meta: PageMeta;
}

export type StoryListResponse = ListResponse<StorySummaryDto>;
export type VideoListResponse = ListResponse<VideoDto>;

export interface StoryDetailResponse {
  data: StoryDetailDto;
}
