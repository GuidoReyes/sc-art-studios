// Contrato de /api/admin/masks, /stories y /videos (tarea 14). Solo tipos.
// A diferencia de la API pública, el admin ve borradores y costos internos, con los nombres de las columnas.
import type { ListResponse } from "./content.js";

export type MaskStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "COMMISSION_EXAMPLE" | "DRAFT";
export type VideoPlatform = "YOUTUBE" | "TIKTOK" | "INSTAGRAM";
export type VideoSource = "MANUAL" | "SYNC";

export interface AdminMaskDto {
  id: string;
  slug: string;
  nameEs: string;
  nameEn: string;
  animal: string;
  descriptionEs: string;
  descriptionEn: string;
  storyEs: string | null;
  storyEn: string | null;
  status: MaskStatus;
  priceUsd: number | null;
  priceGtq: number | null;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  materialsCostGtq: number | null;
  laborHours: number | null;
  packagingProfileId: string | null;
  featured: boolean;
  /** Los fija la publicación en Shopify, no este CRUD. */
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
  /** ISO 8601. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStoryDto {
  id: string;
  slug: string;
  titleEs: string;
  titleEn: string;
  /** HTML ya sanitizado: la API lo limpia al guardarlo. */
  bodyEs: string;
  bodyEn: string;
  coverR2Key: string | null;
  maskId: string | null;
  /** null = borrador; una fecha futura = publicación programada. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminVideoDto {
  id: string;
  /** Deducidos de la URL: el admin solo pega el enlace. */
  platform: VideoPlatform;
  externalId: string;
  url: string;
  title: string;
  thumbnailUrl: string | null;
  maskId: string | null;
  storyId: string | null;
  publishedAt: string | null;
  source: VideoSource;
  createdAt: string;
  updatedAt: string;
}

export interface AdminItemResponse<T> {
  data: T;
}

export type AdminMaskListResponse = ListResponse<AdminMaskDto>;
export type AdminStoryListResponse = ListResponse<AdminStoryDto>;
export type AdminVideoListResponse = ListResponse<AdminVideoDto>;

// POST /api/admin/pricing/suggest (tarea 15, PRD §6). Montos a 2 decimales; % de 0 a 100.
export interface PricingCostBreakdown {
  materialsGtq: number;
  laborGtq: number;
  packagingGtq: number;
  fixedGtq: number;
  totalGtq: number;
  totalUsd: number;
}

export interface PricingOption {
  marginPct: number;
  /** Precio mínimo para ese margen, redondeado hacia arriba al centavo. */
  priceUsd: number;
  /** Comisiones de Shopify y de la pasarela, incluido el cargo fijo. */
  feesUsd: number;
  profitUsd: number;
  profitGtq: number;
}

/** Los parámetros de CostSettings con que se calculó, para que el admin vea de dónde sale. */
export interface PricingSettingsUsed {
  fxUsdGtq: number;
  commissionPct: number;
  gatewayFixedUsd: number;
  monthlyFixedUsd: number;
  expectedUnitsPerMonth: number;
  laborRateGtqPerHour: number;
  targetMarginPct: number;
  /** ISO 8601. */
  updatedAt: string;
}

export interface PricingSuggestion {
  costBreakdown: PricingCostBreakdown;
  /** Margen objetivo y uno por debajo y otro por encima. */
  suggestedPrices: PricingOption[];
  targetPrice: PricingOption;
  settings: PricingSettingsUsed;
}

export type PricingSuggestionResponse = AdminItemResponse<PricingSuggestion>;
