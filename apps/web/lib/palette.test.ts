import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, PALETTE_HEX, SURFACE_CLASSES, SURFACES, type SurfaceName } from "./palette";

const WCAG_AA_NORMAL_TEXT = 4.5;
const globalsCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("contrastRatio", () => {
  it("da 21:1 entre negro y blanco y 1:1 entre colores iguales", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#e8307a", "#e8307a")).toBe(1);
  });
});

describe("paleta", () => {
  it("los colores coinciden con los tokens de globals.css", () => {
    for (const [name, hex] of Object.entries(PALETTE_HEX)) {
      expect(globalsCss).toContain(`--color-${name}: ${hex};`);
    }
  });

  it.each(Object.keys(SURFACES) as SurfaceName[])("la superficie %s pasa WCAG AA para texto normal", (name) => {
    const { bg, text } = SURFACES[name];
    expect(contrastRatio(PALETTE_HEX[bg], PALETTE_HEX[text])).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });

  it.each(Object.keys(SURFACES) as SurfaceName[])("las clases de %s usan los colores declarados", (name) => {
    const { bg, text } = SURFACES[name];
    expect(SURFACE_CLASSES[name]).toBe(`bg-${bg} text-${text}`);
  });
});
