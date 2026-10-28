import { redirect } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

// /admin lleva al resumen; si no hay sesión, el panel manda al login.
export default async function AdminPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  redirect({ href: "/admin/dashboard", locale });
}
