import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MaskDetailDto, MaskDetailResponse } from "@sc-art-studio/shared";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MaskGallery } from "@/components/MaskGallery";
import { PriceTag } from "@/components/PriceTag";
import { ShippingEstimator } from "@/components/ShippingEstimator";
import { StatusPill } from "@/components/StatusPill";
import { VideoEmbed } from "@/components/VideoEmbed";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Link } from "@/i18n/navigation";
import { type Locale, asLocale } from "@/i18n/routing";
import { apiGet } from "@/lib/api";
import { cmToInches, gramsToPounds, localized, toMaskImage } from "@/lib/catalog";
import { type MaskImage, showsPrice } from "@/lib/mask";
import { buildAlternates, localizedPath, SITE_URL } from "@/lib/seo";
import { WHATSAPP_NUMBER } from "@/lib/site";

const META_DESCRIPTION_LENGTH = 160;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // igual que la API: evita pedirle slugs imposibles

type Props = { params: Promise<{ locale: string; slug: string }> };

async function loadMask(slug: string): Promise<MaskDetailDto | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const res = await apiGet<MaskDetailResponse>(`/api/masks/${encodeURIComponent(slug)}`);
  return res?.data ?? null;
}

const imagesOf = (mask: MaskDetailDto, locale: Locale): MaskImage[] =>
  mask.images.map((image) => toMaskImage(image, locale)).filter((image): image is MaskImage => image !== null);

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = asLocale(rawLocale);
  const mask = await loadMask(slug);
  if (!mask) return {};
  const name = localized(mask.name, locale);
  const description = truncate(localized(mask.description, locale), META_DESCRIPTION_LENGTH);
  const image = imagesOf(mask, locale)[0];
  return {
    title: name,
    description,
    alternates: buildAlternates("/masks/[slug]", locale, { slug }),
    openGraph: { title: name, description, images: image ? [{ url: image.src, alt: image.alt }] : undefined },
  };
}

const AVAILABILITY = {
  AVAILABLE: "https://schema.org/InStock",
  RESERVED: "https://schema.org/LimitedAvailability",
  SOLD: "https://schema.org/SoldOut",
  COMMISSION_EXAMPLE: "https://schema.org/Discontinued",
} as const;

/** schema.org/Product para resultados enriquecidos; la oferta solo si hay precio publicado. */
function productJsonLd(mask: MaskDetailDto, locale: Locale, images: MaskImage[]) {
  const url = `${SITE_URL}${localizedPath("/masks/[slug]", locale, { slug: mask.slug })}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: localized(mask.name, locale),
    description: localized(mask.description, locale),
    url,
    image: images.map((image) => image.src),
    brand: { "@type": "Brand", name: "SC Art Studio" },
    ...(mask.priceUsd !== null && showsPrice(mask.status)
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: mask.priceUsd.toFixed(2),
            priceCurrency: "USD",
            availability: AVAILABILITY[mask.status],
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : {}),
  };
}

// `<` escapado: el JSON va dentro de un <script> y no debe poder cerrarlo.
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

const BUTTON =
  "inline-flex w-fit items-center justify-center rounded-full border-4 border-ink px-6 py-3 text-lg font-extrabold shadow-sticker";

export default async function MaskPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  const mask = await loadMask(slug);
  if (!mask) notFound();

  const t = await getTranslations("MaskDetail");
  const name = localized(mask.name, locale);
  const images = imagesOf(mask, locale);
  const story = mask.story ? localized(mask.story, locale) : null;
  const dims = mask.dimensionsCm;
  const isForSale = showsPrice(mask.status);

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(productJsonLd(mask, locale, images)) }} />

      <Link href="/masks" className="font-extrabold underline decoration-4 underline-offset-4">
        ← {t("back")}
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <MaskGallery slug={mask.slug} name={name} animal={mask.animal} images={images} />

        <div className="flex flex-col items-start gap-5">
          <StatusPill status={mask.status} className="-rotate-2" />
          <h1 className="font-display text-5xl leading-tight">{name}</h1>
          <p className="text-lg font-extrabold">{t("handmade")}</p>

          {isForSale && mask.priceUsd !== null && <PriceTag usd={mask.priceUsd} className="text-3xl" />}

          <div className="flex w-full flex-col gap-3 rounded-card border-4 border-ink bg-cream p-5 shadow-sticker">
            {isForSale ? (
              <>
                {/* El carrito de Shopify llega con la integración de pagos; mientras, se aparta por WhatsApp. */}
                <button type="button" disabled className={`${BUTTON} cursor-not-allowed bg-ink/10 text-ink/70`}>
                  {t("buySoon")}
                </button>
                <p className="font-semibold">{t("buySoonHint")}</p>
                <WhatsAppButton phone={WHATSAPP_NUMBER} message={t("whatsappMessage", { name })} />
              </>
            ) : (
              <p className="font-semibold">{mask.status === "SOLD" ? t("soldNote") : t("commissionNote")}</p>
            )}
            <Link href={{ pathname: "/custom", query: { ref: mask.slug } }} className={`${BUTTON} bg-purple text-cream`}>
              {t("askSimilar")}
            </Link>
          </div>

          {isForSale && <ShippingEstimator maskId={mask.id} />}

          <dl className="grid w-full gap-3 sm:grid-cols-2">
            <div className="rounded-card border-4 border-ink bg-turquoise p-4">
              <dt className="text-sm font-extrabold uppercase tracking-wide">{t("animal")}</dt>
              <dd className="font-display text-xl">{mask.animal}</dd>
            </div>
            {dims && (
              <div className="rounded-card border-4 border-ink bg-orange p-4">
                <dt className="text-sm font-extrabold uppercase tracking-wide">{t("dimensions")}</dt>
                <dd className="font-extrabold">
                  {t("dimensionsValue", {
                    length: dims.length,
                    width: dims.width,
                    height: dims.height,
                    lengthIn: cmToInches(dims.length),
                    widthIn: cmToInches(dims.width),
                    heightIn: cmToInches(dims.height),
                  })}
                </dd>
              </div>
            )}
            {mask.weightGrams !== null && (
              <div className="rounded-card border-4 border-ink bg-cream p-4">
                <dt className="text-sm font-extrabold uppercase tracking-wide">{t("weight")}</dt>
                <dd className="font-extrabold">
                  {t("weightValue", { grams: mask.weightGrams, pounds: gramsToPounds(mask.weightGrams) })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <section aria-labelledby="sobre" className="mt-14 grid gap-10 md:grid-cols-2">
        <div>
          <h2 id="sobre" className="font-display text-3xl">
            {t("about")}
          </h2>
          <p className="mt-3 whitespace-pre-line text-lg">{localized(mask.description, locale)}</p>
        </div>
        {story && (
          <div className="rounded-card border-4 border-ink bg-purple p-6 text-cream shadow-sticker-lg">
            <h2 className="font-display text-3xl">{t("story")}</h2>
            <p className="mt-3 whitespace-pre-line text-lg">{story}</p>
          </div>
        )}
      </section>

      {mask.videos.length > 0 && (
        <section aria-labelledby="en-video" className="mt-14">
          <h2 id="en-video" className="font-display text-3xl">
            {t("videos")}
          </h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {mask.videos.map((video) => (
              <li key={`${video.platform}-${video.externalId}`}>
                <VideoEmbed video={video} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {mask.stories.length > 0 && (
        <section aria-labelledby="historias" className="mt-14">
          <h2 id="historias" className="font-display text-3xl">
            {t("stories")}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {mask.stories.map((linked) => (
              <li key={linked.slug}>
                <Link
                  href={{ pathname: "/stories/[slug]", params: { slug: linked.slug } }}
                  className="inline-flex rounded-full border-[3px] border-ink bg-cream px-4 py-1 font-extrabold shadow-sticker"
                >
                  {localized(linked.title, locale)} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
