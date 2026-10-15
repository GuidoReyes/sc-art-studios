import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-start justify-center gap-4 px-4">
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="text-lg">{t("description")}</p>
      <Link href="/" className="rounded-full border-4 border-ink bg-purple px-6 py-3 font-extrabold text-cream">
        {t("backHome")}
      </Link>
    </main>
  );
}
