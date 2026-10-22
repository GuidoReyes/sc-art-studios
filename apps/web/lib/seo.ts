import { routing, type Locale } from "@/i18n/routing";

export type AppPathname = keyof typeof routing.pathnames;

// URL pública del sitio; en Vercel se define NEXT_PUBLIC_SITE_URL por entorno.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://scartstudios.com").replace(/\/$/, "");

export const OG_LOCALES: Record<Locale, string> = { en: "en_US", es: "es_GT" };

export type PathParams = Record<string, string>;

/** Ruta traducida con los segmentos dinámicos ([slug]) reemplazados. */
function translatedPath(href: AppPathname, locale: Locale, params: PathParams = {}): string {
  const entry = routing.pathnames[href];
  const path = typeof entry === "string" ? entry : entry[locale];
  return path.replace(/\[(\w+)\]/g, (_segment, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Falta el parámetro ${name} para ${href}`);
    return encodeURIComponent(value);
  });
}

/** Ruta pública con prefijo de idioma: ("/masks", "es") → "/es/mascaras". */
export function localizedPath(href: AppPathname, locale: Locale, params?: PathParams): string {
  const path = translatedPath(href, locale, params);
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** canonical + hreflang (en, es, x-default) para la metadata de una página. */
export function buildAlternates(href: AppPathname, locale: Locale, params?: PathParams) {
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE_URL}${localizedPath(href, l, params)}`]),
  ) as Record<Locale, string>;
  return {
    canonical: `${SITE_URL}${localizedPath(href, locale, params)}`,
    languages: { ...languages, "x-default": `${SITE_URL}${translatedPath(href, routing.defaultLocale, params)}` },
  };
}
