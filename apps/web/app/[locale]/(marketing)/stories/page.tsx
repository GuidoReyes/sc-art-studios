import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pages" });
  return { title: t("stories") };
}

export default async function StoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlaceholderPage titleKey="stories" />;
}
