import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Link } from "@/i18n/navigation";

const PALETTE = [
  { name: "ink", className: "bg-ink" },
  { name: "cream", className: "bg-cream" },
  { name: "pink", className: "bg-pink" },
  { name: "purple", className: "bg-purple" },
  { name: "turquoise", className: "bg-turquoise" },
  { name: "orange", className: "bg-orange" },
] as const;

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("Home");
  const tPalette = useTranslations("Palette");

  return (
    <>
      <section className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
        <h1 className="font-display text-5xl leading-tight sm:text-7xl">{t("title")}</h1>
        <p className="max-w-xl text-lg font-semibold sm:text-xl">{t("tagline")}</p>
        <Link
          href="/masks"
          className="rounded-full border-4 border-ink bg-purple px-6 py-3 text-lg font-extrabold text-cream transition-transform hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          {t("cta")}
        </Link>
      </section>

      <section aria-labelledby="paleta" className="bg-turquoise py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 id="paleta" className="font-display text-3xl">
            {t("palette")}
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {PALETTE.map(({ name, className }) => (
              <li key={name} className="overflow-hidden rounded-card border-4 border-ink bg-cream">
                <div className={`h-20 ${className}`} />
                <p className="px-3 py-2 font-extrabold">{tPalette(name)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
