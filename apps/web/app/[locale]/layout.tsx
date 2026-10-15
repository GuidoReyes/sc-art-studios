import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Bagel_Fat_One, Nunito } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { asLocale, routing } from "@/i18n/routing";
import { OG_LOCALES, SITE_URL } from "@/lib/seo";
import "../globals.css";

const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-bagel", display: "swap" });
const nunito = Nunito({ weight: ["400", "600", "800"], subsets: ["latin"], variable: "--font-nunito", display: "swap" });

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: "%s · SC Art Studio" },
    description: t("description"),
    openGraph: {
      siteName: "SC Art Studio",
      type: "website",
      locale: OG_LOCALES[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALES[l]),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${bagel.variable} ${nunito.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
