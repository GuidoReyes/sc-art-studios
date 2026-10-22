import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { StoryDetailDto, StoryDetailResponse } from "@sc-art-studio/shared";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VideoEmbed } from "@/components/VideoEmbed";
import { Link } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { apiGet } from "@/lib/api";
import { localized, mediaUrl } from "@/lib/catalog";
import { formatDate } from "@/lib/dates";
import { buildAlternates } from "@/lib/seo";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const META_DESCRIPTION_LENGTH = 160;

type Props = { params: Promise<{ locale: string; slug: string }> };

async function loadStory(slug: string): Promise<StoryDetailDto | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  return (await apiGet<StoryDetailResponse>(`/api/stories/${encodeURIComponent(slug)}`))?.data ?? null;
}

/** Texto plano del HTML para la meta descripción. */
function plainText(html: string, max: number): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = asLocale(rawLocale);
  const story = await loadStory(slug);
  if (!story) return {};
  const title = localized(story.title, locale);
  const cover = story.coverKey ? mediaUrl(story.coverKey) : null;
  return {
    title,
    description: plainText(localized(story.body, locale), META_DESCRIPTION_LENGTH),
    alternates: buildAlternates("/stories/[slug]", locale, { slug }),
    openGraph: { type: "article", title, publishedTime: story.publishedAt, images: cover ? [cover] : undefined },
  };
}

// El cuerpo viene de la API ya sanitizado con sanitize-html al guardarse (tarea 14): solo formato y enlaces seguros.
const PROSE =
  "max-w-none text-lg [&_a]:font-extrabold [&_a]:text-purple [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-pink [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-3xl [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-2xl [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mt-4 [&_ul]:list-disc";

export default async function StoryPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  const story = await loadStory(slug);
  if (!story) notFound();

  const t = await getTranslations("StoriesPage");
  const cover = story.coverKey ? mediaUrl(story.coverKey) : null;
  const maskName = story.mask ? localized(story.mask.name, locale) : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link href="/stories" className="font-extrabold underline decoration-4 underline-offset-4">
        ← {t("back")}
      </Link>
      <header className="mt-6 flex flex-col gap-3">
        <p className="text-sm font-extrabold uppercase tracking-wide">
          <time dateTime={story.publishedAt}>{formatDate(story.publishedAt, locale)}</time>
        </p>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">{localized(story.title, locale)}</h1>
      </header>
      {cover && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-card border-4 border-ink shadow-sticker-lg">
          <Image src={cover} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      )}
      <div className={`mt-6 ${PROSE}`} dangerouslySetInnerHTML={{ __html: localized(story.body, locale) }} />

      {story.mask && maskName && (
        <Link
          href={{ pathname: "/masks/[slug]", params: { slug: story.mask.slug } }}
          className="mt-10 inline-flex rounded-full border-4 border-ink bg-purple px-6 py-3 text-lg font-extrabold text-cream shadow-sticker"
        >
          {t("maskLink", { name: maskName })} →
        </Link>
      )}

      {story.videos.length > 0 && (
        <section aria-labelledby="videos-historia" className="mt-12">
          <h2 id="videos-historia" className="font-display text-3xl">
            {t("videos")}
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {story.videos.map((video) => (
              <li key={`${video.platform}-${video.externalId}`}>
                <VideoEmbed video={video} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
