// Estados visibles en el sitio: los de MaskStatus (Prisma) menos DRAFT, que nunca se publica.
export type PublicMaskStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "COMMISSION_EXAMPLE";

export interface MaskImage {
  src: string;
  alt: string;
}

/** Lo que necesita una tarjeta del catálogo. El precio es el espejo de Shopify que guarda la API. */
export interface MaskSummary {
  slug: string;
  name: string;
  animal: string;
  status: PublicMaskStatus;
  /** null mientras la máscara no tenga precio publicado. */
  priceUsd: number | null;
  image: MaskImage | null;
}

/** Vendidas y ejemplos de encargo quedan como portafolio: sin precio, con "Pide una parecida". */
export function showsPrice(status: PublicMaskStatus): boolean {
  return status === "AVAILABLE" || status === "RESERVED";
}

// Colores para las máscaras que aún no tienen foto; el slug decide cuál, así no cambia entre visitas.
const PLACEHOLDER_SURFACES = ["turquoise", "orange", "purple", "pink"] as const;
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export function placeholderSurface(slug: string): (typeof PLACEHOLDER_SURFACES)[number] {
  // FNV-1a: reparte mejor que sumar los códigos (con la suma casi todas caían en el mismo color).
  const hash = [...slug].reduce((acc, char) => Math.imul(acc ^ char.charCodeAt(0), FNV_PRIME) >>> 0, FNV_OFFSET);
  return PLACEHOLDER_SURFACES[hash % PLACEHOLDER_SURFACES.length];
}
