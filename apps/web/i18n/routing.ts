import { defineRouting } from "next-intl/routing";

// Rutas internas en inglés; cada idioma tiene su propia URL pública (PRD §3).
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
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
