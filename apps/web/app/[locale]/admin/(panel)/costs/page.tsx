import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminCosts } from "@/components/admin/costs/AdminCosts";
import { asLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin.costs" });
  return { title: t("title") };
}

export default async function AdminCostsPage({ params }: Props) {
  setRequestLocale(asLocale((await params).locale));
  return <AdminCosts />;
}
