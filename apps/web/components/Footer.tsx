import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="border-t-4 border-ink bg-ink text-cream">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm sm:flex-row sm:justify-between">
        <p>{t("adultNotice")}</p>
        <p>
          © {new Date().getFullYear()} SC Art Studio · {t("location")}
        </p>
      </div>
    </footer>
  );
}
