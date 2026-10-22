import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { placeholderSurface, showsPrice, type MaskSummary } from "@/lib/mask";
import { SURFACE_CLASSES } from "@/lib/palette";
import { PriceTag } from "./PriceTag";
import { StatusPill } from "./StatusPill";

interface MaskCardProps {
  mask: MaskSummary;
  /** Ver PriceTag: solo para visitantes de Guatemala. */
  gtqPerUsd?: number;
}

export function MaskCard({ mask, gtqPerUsd }: MaskCardProps) {
  const t = useTranslations("Masks");
  const { slug, name, animal, status, priceUsd, image } = mask;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border-4 border-ink bg-cream shadow-sticker transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-sticker-lg has-[a:focus-visible]:outline-4 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ink motion-reduce:transition-none">
      <div className="relative aspect-square overflow-hidden border-b-4 border-ink">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div className={`flex size-full flex-col items-center justify-center gap-5 ${SURFACE_CLASSES[placeholderSurface(slug)]}`}>
            <span aria-hidden="true" className="font-display text-7xl leading-none">
              {animal.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-extrabold">{t("noPhoto")}</span>
          </div>
        )}
        <StatusPill status={status} className="absolute left-3 top-3 -rotate-3" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-xl leading-tight">
          {/* El enlace cubre toda la tarjeta (after:inset-0) sin anidar elementos interactivos. */}
          <Link
            href={{ pathname: "/masks/[slug]", params: { slug } }}
            className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none"
          >
            {name}
          </Link>
        </h3>
        <p className="font-semibold">{animal}</p>
        <div className="mt-auto pt-3">
          {showsPrice(status) ? (
            priceUsd !== null ? (
              <PriceTag usd={priceUsd} gtqPerUsd={gtqPerUsd} />
            ) : (
              <p className="font-extrabold">{t("priceSoon")}</p>
            )
          ) : (
            <p className="font-extrabold text-purple">{t("askSimilar")} →</p>
          )}
        </div>
      </div>
    </article>
  );
}
