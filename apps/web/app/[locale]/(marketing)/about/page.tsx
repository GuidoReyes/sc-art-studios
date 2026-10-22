import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type BookPage, BookViewer } from "@/components/BookViewer";
import { Link } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";

// Fotos del libro: re-codificadas a WebP sin EXIF/GPS (public/book). Solo máscaras, nunca a Scarlett.
const BOOK_MASKS = [
  { slug: "jaguar-dorado", key: "jaguar", name: "Jaguar Dorado", position: "50% 45%" },
  { slug: "lobo-florido", key: "lobo", name: "Lobo Florido", position: "50% 30%" },
  { slug: "venado-rosa", key: "venado", name: "Venado Rosa", position: "50% 50%" },
  { slug: "cebra-magica", key: "cebra", name: "Cebra Mágica", position: "55% 45%" },
] as const;

const photo = (slug: string) => `/book/${slug}.webp`;
const PAGE = "absolute inset-0 flex flex-col gap-[1em] px-[2.4em] pb-[2.9em] pt-[2.3em]";
const HEADING = "m-0 font-display font-normal leading-[1.05] [text-wrap:balance]";
const PILL = "inline-flex w-fit items-center rounded-full border-[.16em] border-ink px-[1.3em] py-[.7em] font-extrabold";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("title"), description: t("intro"), alternates: buildAlternates("/about", locale) };
}

function Frame({ src, alt, position, className = "" }: { src: string; alt: string; position?: string; className?: string }) {
  return (
    <div className={`relative min-h-0 flex-1 overflow-hidden rounded-[1.4em] border-[.22em] border-ink ${className}`}>
      <Image src={src} alt={alt} fill sizes="(min-width: 768px) 400px, 90vw" className="object-cover" style={{ objectPosition: position }} />
    </div>
  );
}

export default async function AboutPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const [jaguar] = BOOK_MASKS;

  const pages: BookPage[] = [
    {
      title: t("coverTitle"),
      isCover: true,
      content: (
        <div className={`${PAGE} items-center justify-between bg-pink-deep text-center text-cream`}>
          <p className="font-display text-[2.4em] leading-none">
            SC Art Studio
            <small className="mt-[.7em] block font-body text-[.32em] font-extrabold uppercase tracking-[.2em]">{t("coverBadge")}</small>
          </p>
          <div className="relative my-[.6em] flex min-h-0 w-[78%] flex-1">
            <Frame src={photo(jaguar.slug)} alt={jaguar.name} position={jaguar.position} className="-rotate-3 shadow-[.5em_.5em_0_#1b1b1b]" />
          </div>
          <p className="font-display text-[1.55em] leading-[1.1]">{t("coverTagline")}</p>
          <p className="text-[.85em] font-extrabold">{t("coverHint")}</p>
        </div>
      ),
    },
    {
      title: t("welcomeTitle"),
      content: (
        <div className={PAGE}>
          <span className="w-fit rounded-full bg-turquoise px-[1.1em] py-[.5em] text-[.82em] font-extrabold">{t("welcomeBadge")}</span>
          <h2 className={`${HEADING} text-[2.6em]`}>{t("welcomeHeading")}</h2>
          <p className="text-[1.05em]">{t("welcomeBody")}</p>
          <div className="mt-auto grid grid-cols-4 gap-[.6em]">
            {BOOK_MASKS.map((mask) => (
              <div key={mask.slug} className="relative aspect-[3/4] overflow-hidden rounded-[1em] border-[.18em] border-ink">
                <Image src={photo(mask.slug)} alt="" fill sizes="100px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: t("meTitle"),
      content: (
        <div className={`${PAGE} bg-purple text-cream`}>
          <h2 className={`${HEADING} text-[2.5em]`}>{t("meTitle")}</h2>
          <p className="text-[1.02em]">{t("meBody1")}</p>
          <p className="text-[1.02em]">{t("meBody2")}</p>
          <Frame src={photo("venado-rosa")} alt="Venado Rosa" position="50% 40%" />
        </div>
      ),
    },
    {
      title: t("meTitle"),
      content: (
        <div className={`${PAGE} bg-purple`}>
          <p className="text-[.78em] font-extrabold uppercase tracking-[.14em] text-cream">{t("factsTitle")}</p>
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[.9em]">
            {[
              { big: "11", label: t("factAge"), className: "bg-cream text-pink-deep" },
              { big: t("factUnique"), label: t("factUniqueLabel"), className: "bg-orange" },
              { mid: t("factAnimals"), label: t("factAnimalsLabel"), className: "bg-turquoise" },
              { mid: t("factBooks"), label: t("factBooksLabel"), className: "bg-cream" },
            ].map(({ big, mid, label, className }) => (
              <div key={label} className={`flex flex-col justify-end gap-[.2em] rounded-[1.3em] p-[1.1em] ${className}`}>
                <b className={`font-display font-normal leading-none ${big ? "text-[2.6em]" : "text-[1.4em]"}`}>{big ?? mid}</b>
                <span className="text-[.92em] font-extrabold leading-[1.3] text-ink">{label}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: t("masksTitle"),
      content: (
        <div className={PAGE}>
          <h2 className={`${HEADING} text-[2.5em]`}>{t("masksTitle")}</h2>
          <p>{t("masksBody")}</p>
          <ul className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[.8em]">
            {BOOK_MASKS.map((mask, index) => (
              <li key={mask.slug} className={`relative min-h-0 ${index % 2 ? "rotate-[1.5deg]" : "-rotate-[1.5deg]"}`}>
                <Link
                  href={{ pathname: "/masks/[slug]", params: { slug: mask.slug } }}
                  className="absolute inset-0 overflow-hidden rounded-[1.2em] border-[.2em] border-ink"
                >
                  <Image src={photo(mask.slug)} alt="" fill sizes="200px" className="object-cover" style={{ objectPosition: mask.position }} />
                  <span className="absolute bottom-[.6em] left-[.6em] rounded-full border-[.15em] border-ink bg-cream px-[.8em] py-[.25em] text-[.75em] font-extrabold">
                    {mask.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    ...BOOK_MASKS.map((mask, index) => ({
      title: mask.name,
      content: (
        <div className={`${PAGE} gap-[.75em]`}>
          <Frame src={photo(mask.slug)} alt={mask.name} position={mask.position} />
          <p className="text-[.78em] font-extrabold uppercase tracking-[.14em] text-purple">
            {t("maskOf", { number: index + 1, total: BOOK_MASKS.length })}
          </p>
          <h3 className={`${HEADING} text-[2em]`}>{mask.name}</h3>
          <p>{t(mask.key)}</p>
          <Link href={{ pathname: "/masks/[slug]", params: { slug: mask.slug } }} className={`${PILL} bg-ink text-cream`}>
            {t("maskCta")} →
          </Link>
        </div>
      ),
    })),
    {
      title: t("howTitle"),
      content: (
        <div className={`${PAGE} bg-orange`}>
          <h2 className={`${HEADING} text-[2.3em]`}>{t("howTitle")}</h2>
          <ol className="flex min-h-0 flex-1 flex-col gap-[.8em]">
            {[
              [t("how1"), t("how1Body"), "text-pink-deep"],
              [t("how2"), t("how2Body"), "text-turquoise"],
              [t("how3"), t("how3Body"), "text-purple"],
            ].map(([title, body, color], index) => (
              <li key={title} className="grid flex-1 grid-cols-[auto_1fr] content-center items-center gap-x-[1em] rounded-[1.3em] bg-cream px-[1.2em] py-[1em]">
                <b className={`row-span-2 font-display text-[2.6em] font-normal leading-none ${color}`}>{index + 1}</b>
                <span className="text-[1.1em] font-extrabold">{title}</span>
                <span className="text-[.9em]">{body}</span>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      title: t("contactTitle"),
      content: (
        <div className={`${PAGE} bg-ink text-cream`}>
          <h2 className={`${HEADING} text-[2.5em]`}>{t("contactTitle")}</h2>
          <p>{t("contactBody")}</p>
          <Link href="/custom" className={`${PILL} border-turquoise bg-turquoise text-ink`}>
            {t("contactCustom")}
          </Link>
          <Link href="/contact" className={`${PILL} border-cream bg-cream text-ink`}>
            {t("contactContact")}
          </Link>
          <div className="grid min-h-0 flex-1 grid-cols-4 gap-[.5em]">
            {BOOK_MASKS.map((mask) => (
              <div key={mask.slug} className="relative overflow-hidden rounded-[.9em]">
                <Image src={photo(mask.slug)} alt="" fill sizes="100px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: t("thanksTitle"),
      content: (
        <div className={`${PAGE} items-center justify-center bg-cream text-center`}>
          <h2 className={`${HEADING} text-[2.7em]`}>{t("thanksTitle")}</h2>
          <p>{t("thanksBody")}</p>
        </div>
      ),
    },
    {
      title: t("backTitle"),
      isCover: true,
      content: (
        <div className={`${PAGE} items-center justify-center bg-purple text-center text-cream`}>
          <div className="grid w-[70%] grid-cols-2 gap-[.6em]">
            {BOOK_MASKS.map((mask) => (
              <div key={mask.slug} className="relative aspect-square overflow-hidden rounded-full border-[.2em] border-cream">
                <Image src={photo(mask.slug)} alt="" fill sizes="120px" className="object-cover" />
              </div>
            ))}
          </div>
          <p className="font-display text-[2em] leading-none">SC Art Studio</p>
          <p>{t("backBody")}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl sm:text-6xl">{t("title")}</h1>
        <p className="max-w-2xl text-lg font-semibold">{t("intro")}</p>
      </header>
      <div className="mt-8">
        <BookViewer pages={pages} label={t("bookLabel")} />
      </div>
      <p className="mt-4 text-sm font-extrabold">{t("hint")}</p>
      <p className="mt-2 text-sm font-semibold">{t("privacy")}</p>
    </div>
  );
}
