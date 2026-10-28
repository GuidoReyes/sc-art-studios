import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { asLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin.login" });
  return { title: t("title") };
}

export default async function AdminLoginPage({ params }: Props) {
  setRequestLocale(asLocale((await params).locale));
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <AdminLoginForm />
    </main>
  );
}
