import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminStories } from "@/components/admin/content/AdminStories";
import { asLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin.stories" });
  return { title: t("title") };
}

export default async function AdminStoriesPage({ params }: Props) {
  setRequestLocale(asLocale((await params).locale));
  return <AdminStories />;
}
