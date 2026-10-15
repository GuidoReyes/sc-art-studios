import { useTranslations } from "next-intl";

type PageKey = "masks" | "custom" | "stories" | "contact";

// Página provisional hasta que cada sección tenga su tarea propia.
export function PlaceholderPage({ titleKey }: { titleKey: PageKey }) {
  const t = useTranslations("Pages");
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-4xl sm:text-5xl">{t(titleKey)}</h1>
      <p className="mt-4 text-lg">{t("comingSoon")}</p>
    </section>
  );
}
