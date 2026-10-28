import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { asLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin.dashboard" });
  return { title: t("title") };
}

export default async function AdminDashboardPage({ params }: Props) {
  setRequestLocale(asLocale((await params).locale));
  return <AdminDashboard />;
}
