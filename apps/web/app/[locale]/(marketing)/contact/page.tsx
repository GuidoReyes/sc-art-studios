import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { asLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Pages" });
  return { title: t("contact"), alternates: buildAlternates("/contact", locale) };
}

export default async function ContactPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  return <PlaceholderPage titleKey="contact" />;
}
