// Pasa los contratos de la API (@sc-art-studio/shared) a lo que muestran los componentes, en el idioma de la página.
import type { LocalizedText, MaskImageDto, MaskSummaryDto } from "@sc-art-studio/shared";
import type { Locale } from "@/i18n/routing";
import type { MaskImage, MaskSummary } from "./mask";

// Dominio público de R2 para las fotos (p. ej. https://media.scartstudios.com). Sin él, las tarjetas muestran el color.
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, "") || undefined;

export const localized = (text: LocalizedText, locale: Locale): string => text[locale];

/** URL pública de una foto guardada en R2; null si no hay dominio configurado. */
export function mediaUrl(key: string): string | null {
  return MEDIA_URL ? `${MEDIA_URL}/${key.split("/").map(encodeURIComponent).join("/")}` : null;
}

export function toMaskImage(image: MaskImageDto, locale: Locale): MaskImage | null {
  const src = mediaUrl(image.key);
  return src ? { src, alt: localized(image.alt, locale) } : null;
}

export function toMaskSummary(mask: MaskSummaryDto, locale: Locale): MaskSummary {
  return {
    slug: mask.slug,
    name: localized(mask.name, locale),
    animal: mask.animal,
    status: mask.status,
    priceUsd: mask.priceUsd,
    image: mask.image ? toMaskImage(mask.image, locale) : null,
  };
}

/** Destacadas primero; si ninguna lo está, las más recientes. */
export function pickFeatured(masks: readonly MaskSummaryDto[], count: number): MaskSummaryDto[] {
  const featured = masks.filter((mask) => mask.featured);
  return (featured.length > 0 ? featured : masks).slice(0, count);
}

/** Animales distintos, ordenados, para el filtro del catálogo. */
export function animalsOf(masks: readonly MaskSummaryDto[]): string[] {
  return [...new Set(masks.map((mask) => mask.animal))].sort((a, b) => a.localeCompare(b));
}

const CM_PER_INCH = 2.54;
const GRAMS_PER_POUND = 453.59237;

/** 30 cm → "11.8" pulgadas (un decimal). */
export const cmToInches = (cm: number): string => (cm / CM_PER_INCH).toFixed(1);

/** 850 g → "1.9" libras (un decimal). */
export const gramsToPounds = (grams: number): string => (grams / GRAMS_PER_POUND).toFixed(1);
