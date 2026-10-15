import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { asLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("title") };
}

export default async function AdminPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  return (
    <section>
      <h1 className="font-display text-3xl">{t("title")}</h1>
      <p className="mt-4">{t("placeholder")}</p>
    </section>
  );
}
