// Copia de los tokens de app/globals.css para calcular contraste; una prueba verifica que coincidan.
export const PALETTE_HEX = {
  ink: "#1b1b1b",
  cream: "#fff6e8",
  pink: "#e8307a",
  "pink-deep": "#c2255f",
  purple: "#6b3fa0",
  turquoise: "#1fa6a0",
  orange: "#f28c28",
  whatsapp: "#25d366",
} as const;

export type PaletteColor = keyof typeof PALETTE_HEX;

/**
 * Fondo + color de texto que pasan WCAG AA (4.5:1). El rosa de marca no llega con ningún texto
 * (4.2:1 con tinta), así que los bloques "pink" usan pink-deep con texto crema.
 */
export const SURFACES = {
  cream: { bg: "cream", text: "ink" },
  pink: { bg: "pink-deep", text: "cream" },
  purple: { bg: "purple", text: "cream" },
  turquoise: { bg: "turquoise", text: "ink" },
  orange: { bg: "orange", text: "ink" },
  ink: { bg: "ink", text: "cream" },
} as const satisfies Record<string, { bg: PaletteColor; text: PaletteColor }>;

export type SurfaceName = keyof typeof SURFACES;

// Clases literales para que Tailwind las detecte al compilar.
export const SURFACE_CLASSES: Record<SurfaceName, string> = {
  cream: "bg-cream text-ink",
  pink: "bg-pink-deep text-cream",
  purple: "bg-purple text-cream",
  turquoise: "bg-turquoise text-ink",
  orange: "bg-orange text-ink",
  ink: "bg-ink text-cream",
};

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG 2.x entre dos colores #rrggbb (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
