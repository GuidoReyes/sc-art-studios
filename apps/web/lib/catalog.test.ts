import { describe, expect, it } from "vitest";
import type { MaskSummaryDto } from "@sc-art-studio/shared";
import { embedUrl } from "@/components/VideoEmbed";
import { animalsOf, cmToInches, gramsToPounds, pickFeatured, toMaskSummary } from "./catalog";
import { catalogQuery, parseCatalogFilters } from "./catalogQuery";
import { placeholderSurface } from "./mask";
import { buildAlternates, localizedPath, SITE_URL } from "./seo";

const mask = (slug: string, extra: Partial<MaskSummaryDto> = {}): MaskSummaryDto => ({
  id: slug,
  slug,
  name: { es: `Máscara ${slug}`, en: `Mask ${slug}` },
  animal: "Jaguar",
  status: "AVAILABLE",
  priceUsd: 95,
  priceGtq: null,
  featured: false,
  publishedAt: null,
  shopifyProductId: null,
  image: null,
  ...extra,
});

describe("toMaskSummary", () => {
  it("elige el nombre del idioma y deja la foto vacía si no hay dominio de R2", () => {
    const summary = toMaskSummary(mask("a", { image: { key: "masks/a.webp", alt: { es: "a", en: "a" }, sortOrder: 0 } }), "en");

    expect(summary).toMatchObject({ slug: "a", name: "Mask a", priceUsd: 95, image: null });
  });

  it("conserva un precio todavía sin publicar como null", () => {
    expect(toMaskSummary(mask("a", { priceUsd: null }), "es").priceUsd).toBeNull();
  });
});

describe("pickFeatured y animalsOf", () => {
  it("prefiere las destacadas y, si no hay, toma las primeras", () => {
    const list = [mask("a"), mask("b", { featured: true }), mask("c")];

    expect(pickFeatured(list, 4).map((m) => m.slug)).toEqual(["b"]);
    expect(pickFeatured([mask("a"), mask("c")], 1).map((m) => m.slug)).toEqual(["a"]);
  });

  it("lista los animales sin repetir y en orden", () => {
    expect(animalsOf([mask("a", { animal: "Lobo" }), mask("b"), mask("c", { animal: "Lobo" })])).toEqual(["Jaguar", "Lobo"]);
  });
});

describe("unidades", () => {
  it("convierte a pulgadas y libras con un decimal", () => {
    expect(cmToInches(30)).toBe("11.8");
    expect(gramsToPounds(850)).toBe("1.9");
  });
});

describe("filtros del catálogo", () => {
  it("acepta filtros válidos", () => {
    expect(parseCatalogFilters({ status: "SOLD", animal: " Lobo ", page: "2" })).toEqual({ status: "SOLD", animal: "Lobo", page: 2 });
  });

  it("ignora lo inválido en vez de fallar", () => {
    expect(parseCatalogFilters({ status: "DRAFT", animal: "", page: "abc" })).toEqual({ status: undefined, animal: undefined, page: 1 });
    expect(parseCatalogFilters({ page: "9999" }).page).toBe(1);
    expect(parseCatalogFilters({ status: ["SOLD", "AVAILABLE"] }).status).toBe("SOLD");
  });

  it("cambiar un filtro vuelve a la página 1; la página 1 no va en la URL", () => {
    const filters = { status: "SOLD" as const, animal: "Lobo", page: 3 };

    expect(catalogQuery(filters, { animal: undefined })).toEqual({ status: "SOLD" });
    expect(catalogQuery(filters, { page: 4 })).toEqual({ status: "SOLD", animal: "Lobo", page: "4" });
  });
});

describe("rutas con slug", () => {
  it("traduce la ruta y pone el slug", () => {
    expect(localizedPath("/masks/[slug]", "es", { slug: "jaguar-dorado" })).toBe("/es/mascaras/jaguar-dorado");
    expect(buildAlternates("/masks/[slug]", "en", { slug: "lobo" }).languages).toEqual({
      en: `${SITE_URL}/en/masks/lobo`,
      es: `${SITE_URL}/es/mascaras/lobo`,
      "x-default": `${SITE_URL}/masks/lobo`,
    });
  });

  it("falla si falta el parámetro en vez de publicar /[slug]", () => {
    expect(() => localizedPath("/masks/[slug]", "es")).toThrow("Falta el parámetro slug");
  });
});

describe("embedUrl", () => {
  it("usa el reproductor de cada plataforma", () => {
    expect(embedUrl({ platform: "YOUTUBE", externalId: "dQw4w9WgXcQ", url: "" })).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedUrl({ platform: "TIKTOK", externalId: "7312345678901234567", url: "" })).toBe(
      "https://www.tiktok.com/embed/v2/7312345678901234567",
    );
    expect(embedUrl({ platform: "INSTAGRAM", externalId: "C1", url: "https://www.instagram.com/reel/C1/" })).toBe(
      "https://www.instagram.com/reel/C1/embed",
    );
  });
});

describe("placeholderSurface", () => {
  it("siempre da el mismo color para el mismo slug", () => {
    expect(placeholderSurface("jaguar-dorado")).toBe(placeholderSurface("jaguar-dorado"));
    expect(placeholderSurface("jaguar-dorado")).toBe("pink");
  });
});
