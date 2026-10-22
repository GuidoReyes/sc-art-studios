import type { Metadata } from "next";
import Image from "next/image";
import type { MaskListResponse, VideoListResponse } from "@sc-art-studio/shared";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MaskCard } from "@/components/MaskCard";
import { SectionBlock } from "@/components/SectionBlock";
import { VideoEmbed } from "@/components/VideoEmbed";
import { Link } from "@/i18n/navigation";
import { type Locale, asLocale } from "@/i18n/routing";
import { apiGet, orFallback } from "@/lib/api";
import { pickFeatured, toMaskSummary } from "@/lib/catalog";
import { buildAlternates } from "@/lib/seo";

const FEATURED_COUNT = 4;
const LATEST_VIDEOS = 3;
// Suficiente para elegir destacadas sin paginar (el tope de la API es 48).
const HOME_MASK_POOL = 48;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return { alternates: buildAlternates("/", locale) };
}

const BUTTON =
  "inline-flex items-center rounded-full border-4 border-ink px-6 py-3 text-lg font-extrabold shadow-sticker transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker-lg focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink motion-reduce:transition-none";

// Calcomanías del hero: fotos de máscaras (public/book, sin EXIF), giradas a mano. Decorativas.
const STICKERS = [
  { key: "sticker1", photo: "jaguar-dorado", className: "rotate-[-8deg] left-0 top-4" },
  { key: "sticker2", photo: "lobo-florido", className: "rotate-[6deg] right-0 top-0" },
  { key: "sticker3", photo: "venado-rosa", className: "rotate-[-3deg] left-8 bottom-0" },
  { key: "sticker4", photo: "cebra-magica", className: "rotate-[9deg] right-2 bottom-6" },
] as const;

async function loadHome() {
  const [masks, videos] = await Promise.all([
    orFallback(apiGet<MaskListResponse>("/api/masks", { limit: HOME_MASK_POOL }), null, "inicio:masks"),
    orFallback(apiGet<VideoListResponse>("/api/videos", { limit: LATEST_VIDEOS }), null, "inicio:videos"),
  ]);
  return { masks: masks?.data ?? [], videos: videos?.data ?? [] };
}

export default async function HomePage({ params }: Props) {
  const locale: Locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const { masks, videos } = await loadHome();
  const featured = pickFeatured(masks, FEATURED_COUNT).map((mask) => toMaskSummary(mask, locale));

  const steps = [
    { title: t("step1Title"), body: t("step1Body"), color: "bg-turquoise" },
    { title: t("step2Title"), body: t("step2Body"), color: "bg-orange" },
    { title: t("step3Title"), body: t("step3Body"), color: "bg-pink" },
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:py-20 md:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col items-start gap-6">
            <p className="rounded-full border-[3px] border-ink bg-cream px-4 py-1 text-sm font-extrabold uppercase tracking-wide shadow-sticker">
              {t("eyebrow")}
            </p>
            <h1 className="font-display text-5xl leading-[1.02] sm:text-7xl">{t("title")}</h1>
            <p className="max-w-xl text-lg font-semibold sm:text-xl">{t("tagline")}</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/masks" className={`${BUTTON} bg-purple text-cream`}>
                {t("cta")}
              </Link>
              <Link href="/custom" className={`${BUTTON} bg-cream`}>
                {t("ctaCustom")}
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto h-72 w-full max-w-sm sm:h-96">
            {STICKERS.map(({ key, photo, className }) => (
              <span
                key={key}
                className={`absolute h-40 w-32 overflow-hidden rounded-card border-4 border-ink bg-ink shadow-sticker-lg sm:h-52 sm:w-40 ${className}`}
              >
                <Image src={`/book/${photo}.webp`} alt="" fill sizes="160px" className="object-cover" priority />
                <span className="absolute bottom-2 left-2 rounded-full border-[3px] border-ink bg-cream px-3 py-0.5 font-display text-sm">
                  {t(key)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <SectionBlock color="turquoise" aria-labelledby="destacadas">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="destacadas" className="font-display text-4xl">
            {t("featuredTitle")}
          </h2>
          {featured.length > 0 && (
            <Link href="/masks" className="font-extrabold underline decoration-4 underline-offset-4">
              {t("featuredAll")} →
            </Link>
          )}
        </div>
        {featured.length > 0 ? (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((mask) => (
              <li key={mask.slug}>
                <MaskCard mask={mask} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-lg font-semibold">{t("featuredEmpty")}</p>
        )}
      </SectionBlock>

      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <SectionBlock color="purple" isCard aria-labelledby="scarlett">
          <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
            <span
              aria-hidden="true"
              className="flex size-32 rotate-[-6deg] items-center justify-center rounded-full border-4 border-ink bg-orange font-display text-6xl text-ink shadow-sticker-lg"
            >
              S
            </span>
            <div className="flex flex-col items-start gap-4">
              <h2 id="scarlett" className="font-display text-4xl">
                {t("meetTitle")}
              </h2>
              <p className="max-w-2xl text-lg font-semibold">{t("meetBody")}</p>
              <Link href="/about" className={`${BUTTON} bg-cream text-ink`}>
                {t("meetCta")}
              </Link>
            </div>
          </div>
        </SectionBlock>
      </div>

      {videos.length > 0 && (
        <SectionBlock color="orange" aria-labelledby="videos">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="videos" className="font-display text-4xl">
              {t("videosTitle")}
            </h2>
            <Link href="/videos" className="font-extrabold underline decoration-4 underline-offset-4">
              {t("videosAll")} →
            </Link>
          </div>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {videos.map((video) => (
              <li key={video.id}>
                <VideoEmbed video={video} />
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      <section aria-labelledby="como-comprar" className="mx-auto max-w-5xl px-4 pb-14 sm:pb-20">
        <h2 id="como-comprar" className="font-display text-4xl">
          {t("howTitle")}
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map(({ title, body, color }, index) => (
            <li key={title} className="relative rounded-card border-4 border-ink bg-cream p-6 pt-10 shadow-sticker">
              <span
                aria-hidden="true"
                className={`absolute -top-6 left-5 flex size-12 items-center justify-center rounded-full border-4 border-ink font-display text-2xl ${color}`}
              >
                {index + 1}
              </span>
              <h3 className="font-display text-2xl">{title}</h3>
              <p className="mt-2 font-semibold">{body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-lg font-extrabold">
          <Link href="/custom" className="underline decoration-pink decoration-4 underline-offset-4">
            {t("howCustom")}
          </Link>
        </p>
      </section>
    </>
  );
}
