import type { Metadata } from "next";
import type { MaskDetailResponse, MaskListResponse } from "@sc-art-studio/shared";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CustomRequestForm } from "@/components/CustomRequestForm";
import { MaskCard } from "@/components/MaskCard";
import { type Locale, asLocale } from "@/i18n/routing";
import { apiGet, orFallback } from "@/lib/api";
import { localized, toMaskSummary } from "@/lib/catalog";
import { buildAlternates } from "@/lib/seo";
import { WHATSAPP_NUMBER } from "@/lib/site";

const EXAMPLES_LIMIT = 4;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // igual que la API

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Pages" });
  const tCustom = await getTranslations({ locale, namespace: "CustomPage" });
  return { title: t("custom"), description: tCustom("intro"), alternates: buildAlternates("/custom", locale) };
}

/** Nombre de la máscara de "Quiero una parecida" (?ref=slug); si no existe, se ignora. */
async function inspirationName(ref: unknown, locale: Locale): Promise<string | null> {
  if (typeof ref !== "string" || !SLUG_PATTERN.test(ref)) return null;
  const res = await orFallback(apiGet<MaskDetailResponse>(`/api/masks/${encodeURIComponent(ref)}`), null, "custom:ref");
  return res ? localized(res.data.name, locale) : null;
}

const STEPS = ["tell", "talk", "make"] as const;
// pink-deep con texto crema: el rosa claro con tinta no llega a 4.5:1 (WCAG AA).
const STEP_COLORS = ["bg-pink-deep text-cream", "bg-orange", "bg-turquoise"] as const;

export default async function CustomPage({ params, searchParams }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const { ref } = await searchParams;
  const [t, tPages, examples, inspiration] = await Promise.all([
    getTranslations("CustomPage"),
    getTranslations("Pages"),
    orFallback(apiGet<MaskListResponse>("/api/masks", { status: "COMMISSION_EXAMPLE", limit: EXAMPLES_LIMIT }), null, "custom:examples"),
    inspirationName(ref, locale),
  ]);
  const exampleMasks = (examples?.data ?? []).map((mask) => toMaskSummary(mask, locale));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="flex max-w-3xl flex-col gap-4">
        <h1 className="font-display text-5xl sm:text-6xl">{tPages("custom")}</h1>
        <p className="text-lg font-semibold">{t("intro")}</p>
      </header>

      <ol className="mt-10 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step} className={`rounded-card border-4 border-ink p-5 shadow-sticker ${STEP_COLORS[index]}`}>
            <span className="font-display text-4xl" aria-hidden="true">
              {index + 1}
            </span>
            <h2 className="mt-2 font-display text-2xl">{t(`steps.${step}.title`)}</h2>
            <p className="mt-1 font-semibold">{t(`steps.${step}.body`)}</p>
          </li>
        ))}
      </ol>

      {exampleMasks.length > 0 && (
        <section aria-labelledby="ejemplos" className="mt-14">
          <h2 id="ejemplos" className="font-display text-3xl">
            {t("examples")}
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {exampleMasks.map((mask) => (
              <li key={mask.slug}>
                <MaskCard mask={mask} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="formulario" className="mt-14">
        <h2 id="formulario" className="font-display text-3xl">
          {t("formTitle")}
        </h2>
        {inspiration && <p className="mt-2 text-lg font-extrabold">{t("inspiredBy", { name: inspiration })}</p>}
        <div className="mt-6">
          <CustomRequestForm
            initialIdea={inspiration ? t("ideaFromRef", { name: inspiration }) : ""}
            whatsappNumber={WHATSAPP_NUMBER}
          />
        </div>
      </section>
    </div>
  );
}
