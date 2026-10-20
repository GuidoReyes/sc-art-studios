// Piezas comunes de los repositorios públicos: qué se lee y cómo se convierte para la API.
import type { MaskLinkDto, MaskVideoDto } from "@sc-art-studio/shared";
import type { Prisma } from "../generated/prisma/client.js";

export const MASK_LINK_SELECT = { slug: true, nameEs: true, nameEn: true, status: true } satisfies Prisma.MaskSelect;

export const VIDEO_EMBED_SELECT = {
  platform: true,
  url: true,
  externalId: true,
  title: true,
  thumbnailUrl: true,
  publishedAt: true,
} satisfies Prisma.VideoSelect;

type MaskLinkRow = Prisma.MaskGetPayload<{ select: typeof MASK_LINK_SELECT }>;
type VideoEmbedRow = Prisma.VideoGetPayload<{ select: typeof VIDEO_EMBED_SELECT }>;

/** Lo más reciente primero; lo que aún no tiene fecha queda al final (MySQL ordena NULL como el menor). */
export function latestFirst() {
  return [{ publishedAt: "desc" as const }, { createdAt: "desc" as const }];
}

/** Publicado y con fecha ya cumplida: una fecha futura es una publicación programada. */
export function publishedBy(now: Date) {
  return { publishedAt: { not: null, lte: now } };
}

export function toIso(date: Date | null): string | null {
  return date?.toISOString() ?? null;
}

// Un enlace a un borrador revelaría la máscara antes de tiempo: se omite.
export function toMaskLink(mask: MaskLinkRow | null): MaskLinkDto | null {
  if (!mask || mask.status === "DRAFT") return null;
  return { slug: mask.slug, name: { es: mask.nameEs, en: mask.nameEn } };
}

export function toVideoEmbed(video: VideoEmbedRow): MaskVideoDto {
  return { ...video, publishedAt: toIso(video.publishedAt) };
}
