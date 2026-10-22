import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { placeholderSurface } from "@/lib/mask";
import { SURFACE_CLASSES } from "@/lib/palette";

export interface StoryCardData {
  slug: string;
  title: string;
  cover: string | null;
  /** Ya formateada en el idioma de la página. */
  date: string;
  maskName: string | null;
}

export function StoryCard({ story }: { story: StoryCardData }) {
  const t = useTranslations("StoriesPage");
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border-4 border-ink bg-cream shadow-sticker transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-sticker-lg has-[a:focus-visible]:outline-4 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ink motion-reduce:transition-none">
      <div className="relative aspect-[4/3] overflow-hidden border-b-4 border-ink">
        {story.cover ? (
          <Image src={story.cover} alt="" fill sizes="(min-width: 1024px) 320px, 100vw" className="object-cover" />
        ) : (
          <div aria-hidden="true" className={`flex size-full items-center justify-center font-display text-6xl ${SURFACE_CLASSES[placeholderSurface(story.slug)]}`}>
            {story.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-sm font-extrabold uppercase tracking-wide">
          <time>{story.date}</time>
        </p>
        <h2 className="font-display text-2xl leading-tight">
          <Link
            href={{ pathname: "/stories/[slug]", params: { slug: story.slug } }}
            className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none"
          >
            {story.title}
          </Link>
        </h2>
        {story.maskName && <p className="font-semibold">{t("aboutMask", { name: story.maskName })}</p>}
        <p className="mt-auto pt-2 font-extrabold text-purple">{t("read")} →</p>
      </div>
    </article>
  );
}
