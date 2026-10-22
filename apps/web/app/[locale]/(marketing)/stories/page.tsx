import type { Metadata } from "next";
import type { StoryListResponse } from "@sc-art-studio/shared";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StoryCard } from "@/components/StoryCard";
import { asLocale } from "@/i18n/routing";
import { apiGet, orFallback } from "@/lib/api";
import { localized, mediaUrl } from "@/lib/catalog";
import { formatDate } from "@/lib/dates";
import { buildAlternates } from "@/lib/seo";

const STORIES_LIMIT = 48; // tope de la API; paginar cuando haya más

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const [t, tPage] = await Promise.all([
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "StoriesPage" }),
  ]);
  return { title: t("stories"), description: tPage("intro"), alternates: buildAlternates("/stories", locale) };
}

export default async function StoriesPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, tPages] = await Promise.all([getTranslations("StoriesPage"), getTranslations("Pages")]);
  // Si la API no responde (también durante el build), la lista sale vacía y se regenera a los 60 s.
  const list = await orFallback(apiGet<StoryListResponse>("/api/stories", { limit: STORIES_LIMIT }), null, "historias");
  const stories = (list?.data ?? []).map((story) => ({
    slug: story.slug,
    title: localized(story.title, locale),
    cover: story.coverKey ? mediaUrl(story.coverKey) : null,
    date: formatDate(story.publishedAt, locale),
    maskName: story.mask ? localized(story.mask.name, locale) : null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-5xl sm:text-6xl">{tPages("stories")}</h1>
      <p className="mt-3 max-w-2xl text-lg font-semibold">{t("intro")}</p>
      {stories.length > 0 ? (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <li key={story.slug}>
              <StoryCard story={story} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 rounded-card border-4 border-dashed border-ink p-8 text-lg font-semibold">{t("empty")}</p>
      )}
    </div>
  );
}
