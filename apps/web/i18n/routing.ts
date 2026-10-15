import { hasLocale } from "next-intl";
import { defineRouting } from "next-intl/routing";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Rutas internas en inglés; cada idioma tiene su propia URL pública (PRD §3).
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  // Recordar el idioma elegido entre visitas (cookie funcional, sin datos personales).
  localeCookie: { maxAge: ONE_YEAR_SECONDS },
  pathnames: {
    "/": "/",
    "/masks": { en: "/masks", es: "/mascaras" },
    "/custom": { en: "/custom", es: "/personalizada" },
    "/stories": { en: "/stories", es: "/historias" },
    "/contact": { en: "/contact", es: "/contacto" },
    "/admin": "/admin",
  },
});

export type Locale = (typeof routing.locales)[number];

/** Valida un segmento [locale] de la URL; si no es válido, usa el idioma por defecto. */
export function asLocale(value: string): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
