import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { type AppPathname, buildAlternates } from "@/lib/seo";

// Rutas públicas indexables (el admin queda fuera a propósito).
const PUBLIC_PATHS: readonly AppPathname[] = ["/", "/masks", "/custom", "/stories", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap((href) =>
    routing.locales.map((locale) => {
      const { canonical, languages } = buildAlternates(href, locale);
      return { url: canonical, alternates: { languages } };
    }),
  );
}
