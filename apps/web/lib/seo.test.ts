import { describe, expect, it, vi } from "vitest";
import { buildAlternates, localizedPath, OG_LOCALES, SITE_URL } from "./seo";

describe("localizedPath", () => {
  it("antepone el idioma y traduce la ruta interna", () => {
    expect(localizedPath("/masks", "en")).toBe("/en/masks");
    expect(localizedPath("/masks", "es")).toBe("/es/mascaras");
    expect(localizedPath("/custom", "es")).toBe("/es/personalizada");
  });

  it("la portada no lleva barra final", () => {
    expect(localizedPath("/", "en")).toBe("/en");
    expect(localizedPath("/", "es")).toBe("/es");
  });
});

describe("buildAlternates", () => {
  it("canonical apunta a la URL del idioma actual", () => {
    expect(buildAlternates("/masks", "es").canonical).toBe(`${SITE_URL}/es/mascaras`);
  });

  it("incluye en, es y x-default (sin prefijo, igual que la cabecera Link de next-intl)", () => {
    expect(buildAlternates("/stories", "en").languages).toEqual({
      en: `${SITE_URL}/en/stories`,
      es: `${SITE_URL}/es/historias`,
      "x-default": `${SITE_URL}/stories`,
    });
  });

  it("x-default de la portada es la raíz del sitio", () => {
    expect(buildAlternates("/", "en").languages["x-default"]).toBe(`${SITE_URL}/`);
  });
});

describe("OG_LOCALES", () => {
  it("usa en_US y es_GT", () => {
    expect(OG_LOCALES).toEqual({ en: "en_US", es: "es_GT" });
  });
});

describe("SITE_URL", () => {
  it("usa el dominio por defecto si NEXT_PUBLIC_SITE_URL está vacía", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.resetModules();
    const { SITE_URL: url } = await import("./seo");
    expect(url).toBe("https://scartstudios.com");
    vi.unstubAllEnvs();
  });

  it("quita la barra final de NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.scartstudios.com/");
    vi.resetModules();
    const { SITE_URL: url } = await import("./seo");
    expect(url).toBe("https://preview.scartstudios.com");
    vi.unstubAllEnvs();
  });
});
