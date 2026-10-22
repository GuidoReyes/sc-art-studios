import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { type AppPathname, buildAlternates } from "@/lib/seo";

// Rutas públicas indexables (el admin queda fuera a propósito).
// Las fichas /masks/[slug] se agregan cuando haya catálogo (vienen de Shopify).
const PUBLIC_PATHS: readonly AppPathname[] = [
  "/",
  "/masks",
  "/custom",
  "/stories",
  "/about",
  "/videos",
  "/contact",
  "/shipping",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap((href) =>
    routing.locales.map((locale) => {
      const { canonical, languages } = buildAlternates(href, locale);
      return { url: canonical, alternates: { languages } };
    }),
  );
}
