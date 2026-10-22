import type { Locale } from "@/i18n/routing";

/** "21 de octubre de 2026" / "October 21, 2026". En UTC para que el servidor y el navegador coincidan. */
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
}
