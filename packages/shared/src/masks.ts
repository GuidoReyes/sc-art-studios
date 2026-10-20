// Contrato de GET /api/masks y GET /api/masks/:slug (PRD §4.5). Solo tipos: la API los importa con `import type`.
// Nunca incluye costos internos (materiales, horas, empaque): esos se quedan en el admin.

/** Estados visibles en el sitio: todos menos DRAFT, que nunca sale de la API pública. */
export type PublicMaskStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "COMMISSION_EXAMPLE";

export interface LocalizedText {
  es: string;
  en: string;
}

export interface MaskImageDto {
  /** Llave del objeto en R2; el frontend arma la URL con su dominio público. */
  key: string;
  alt: LocalizedText;
  sortOrder: number;
}

export interface MaskSummaryDto {
  id: string;
  slug: string;
  name: LocalizedText;
  animal: string;
  status: PublicMaskStatus;
  /** Espejo de Shopify, que es la fuente de verdad del precio. */
  priceUsd: number | null;
  priceGtq: number | null;
  featured: boolean;
  /** ISO 8601. */
  publishedAt: string | null;
  /** Para unir con la Storefront API de Shopify. */
  shopifyProductId: string | null;
  /** La primera foto según `sortOrder`. */
  image: MaskImageDto | null;
}

export interface MaskVideoDto {
  platform: "YOUTUBE" | "TIKTOK" | "INSTAGRAM";
  url: string;
  externalId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

export interface MaskStoryLinkDto {
  slug: string;
  title: LocalizedText;
}

export interface MaskDimensionsCm {
  length: number;
  width: number;
  height: number;
}

export interface MaskDetailDto extends Omit<MaskSummaryDto, "image"> {
  description: LocalizedText;
  story: LocalizedText | null;
  shopifyVariantId: string | null;
  /** Para el estimador de envío. */
  weightGrams: number | null;
  dimensionsCm: MaskDimensionsCm | null;
  images: MaskImageDto[];
  videos: MaskVideoDto[];
  /** Solo historias ya publicadas. */
  stories: MaskStoryLinkDto[];
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
}

export interface MaskListResponse {
  data: MaskSummaryDto[];
  meta: PageMeta;
}

export interface MaskDetailResponse {
  data: MaskDetailDto;
}
