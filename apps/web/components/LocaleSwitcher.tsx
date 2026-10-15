"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const otherLocale: Locale = locale === "en" ? "es" : "en";

  return (
    <Link
      href={pathname}
      locale={otherLocale}
      hrefLang={otherLocale}
      lang={otherLocale}
      title={t("label")}
      className="rounded-full border-4 border-ink bg-orange px-4 py-1 text-ink"
    >
      {t("switchTo")}
    </Link>
  );
}
