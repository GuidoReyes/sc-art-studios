import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminVideos } from "@/components/admin/content/AdminVideos";
import { asLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin.videos" });
  return { title: t("title") };
}

export default async function AdminVideosPage({ params }: Props) {
  setRequestLocale(asLocale((await params).locale));
  return <AdminVideos />;
}
