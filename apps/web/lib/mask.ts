// Estados visibles en el sitio: los de MaskStatus (Prisma) menos DRAFT, que nunca se publica.
export type PublicMaskStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "COMMISSION_EXAMPLE";

export interface MaskImage {
  src: string;
  alt: string;
}

/** Lo que necesita una tarjeta del catálogo (Shopify + datos editoriales unidos por shopifyProductId). */
export interface MaskSummary {
  slug: string;
  name: string;
  animal: string;
  status: PublicMaskStatus;
  priceUsd: number;
  image: MaskImage | null;
}

/** Vendidas y ejemplos de encargo quedan como portafolio: sin precio, con "Pide una parecida". */
export function showsPrice(status: PublicMaskStatus): boolean {
  return status === "AVAILABLE" || status === "RESERVED";
}
