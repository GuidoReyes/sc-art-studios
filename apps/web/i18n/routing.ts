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
    "/masks/[slug]": { en: "/masks/[slug]", es: "/mascaras/[slug]" },
    "/custom": { en: "/custom", es: "/personalizada" },
    "/stories": { en: "/stories", es: "/historias" },
    "/stories/[slug]": { en: "/stories/[slug]", es: "/historias/[slug]" },
    "/about": { en: "/about-scarlett", es: "/sobre-scarlett" },
    "/videos": "/videos",
    "/contact": { en: "/contact", es: "/contacto" },
    "/shipping": { en: "/shipping", es: "/envios" },
    "/privacy": { en: "/privacy", es: "/privacidad" },
    "/terms": { en: "/terms", es: "/terminos" },
    "/admin": "/admin",
  },
});

export type Locale = (typeof routing.locales)[number];

/** Valida un segmento [locale] de la URL; si no es válido, usa el idioma por defecto. */
export function asLocale(value: string): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
