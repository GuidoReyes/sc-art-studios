"use client";

import type { ComponentProps } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type LinkHref = ComponentProps<typeof Link>["href"];

export function LocaleSwitcher({ className = "inline-flex" }: { className?: string }) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as Locale;
  // Ruta interna ("/masks/[slug]") + params de la URL actual: sirve también para páginas dinámicas.
  // TypeScript no puede relacionar una ruta cualquiera con sus params, de ahí la aserción.
  const href = { pathname: usePathname(), params: useParams() } as LinkHref;
  const otherLocale: Locale = locale === "en" ? "es" : "en";

  return (
    <Link
      href={href}
      locale={otherLocale}
      hrefLang={otherLocale}
      lang={otherLocale}
      title={t("label")}
      className={`items-center gap-2 rounded-full border-[3px] border-ink bg-orange px-4 py-1.5 font-extrabold text-ink transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink motion-reduce:transition-none ${className}`}
    >
      {/* Bandera decorativa: el idioma lo dice el texto (en Windows se ve como "US"/"GT"). */}
      <span aria-hidden="true">{t("flag")}</span>
      {t("switchTo")}
    </Link>
  );
}
