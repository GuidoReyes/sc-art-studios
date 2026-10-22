import type { Metadata } from "next";
import type { VideoListResponse } from "@sc-art-studio/shared";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VideoEmbed } from "@/components/VideoEmbed";
import { Link } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { apiGet, orFallback } from "@/lib/api";
import { localized } from "@/lib/catalog";
import { buildAlternates } from "@/lib/seo";

const VIDEOS_LIMIT = 24;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const [t, tPage] = await Promise.all([
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "VideosPage" }),
  ]);
  return { title: t("videos"), description: tPage("intro"), alternates: buildAlternates("/videos", locale) };
}

export default async function VideosPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, tPages] = await Promise.all([getTranslations("VideosPage"), getTranslations("Pages")]);
  // Si la API no responde (también durante el build), la lista sale vacía y se regenera a los 60 s.
  const videos = (await orFallback(apiGet<VideoListResponse>("/api/videos", { limit: VIDEOS_LIMIT }), null, "videos"))?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-5xl sm:text-6xl">{tPages("videos")}</h1>
      <p className="mt-3 max-w-2xl text-lg font-semibold">{t("intro")}</p>
      {videos.length > 0 ? (
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <li key={video.id} className="flex flex-col gap-2">
              <VideoEmbed video={video} />
              {video.mask && (
                <Link
                  href={{ pathname: "/masks/[slug]", params: { slug: video.mask.slug } }}
                  className="w-fit font-extrabold underline underline-offset-4"
                >
                  {t("fromMask", { name: localized(video.mask.name, locale) })} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 rounded-card border-4 border-dashed border-ink p-8 text-lg font-semibold">{t("empty")}</p>
      )}
    </div>
  );
}
