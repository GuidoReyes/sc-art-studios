"use client";

import { useTranslations } from "next-intl";

// Si la API no responde, el catálogo o la ficha muestran esto en vez de una página rota.
export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Error");
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="font-display text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="text-lg">{t("description")}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border-4 border-ink bg-purple px-6 py-3 text-lg font-extrabold text-cream shadow-sticker focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        {t("retry")}
      </button>
    </section>
  );
}
