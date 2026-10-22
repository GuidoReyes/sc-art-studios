import Image from "next/image";
import { useTranslations } from "next-intl";
import { placeholderSurface, type MaskImage } from "@/lib/mask";
import { SURFACE_CLASSES } from "@/lib/palette";

interface MaskGalleryProps {
  slug: string;
  name: string;
  animal: string;
  images: readonly MaskImage[];
}

/** Fotos de la ficha en una fila con scroll-snap: funciona sin JavaScript y con el dedo en el móvil. */
export function MaskGallery({ slug, name, animal, images }: MaskGalleryProps) {
  const t = useTranslations("MaskDetail");
  const tMasks = useTranslations("Masks");

  if (images.length === 0) {
    return (
      <div
        className={`flex aspect-square flex-col items-center justify-center gap-6 rounded-card border-4 border-ink shadow-sticker-lg ${SURFACE_CLASSES[placeholderSurface(slug)]}`}
      >
        <span aria-hidden="true" className="font-display text-[9rem] leading-none sm:text-[12rem]">
          {animal.charAt(0).toUpperCase()}
        </span>
        <span className="text-lg font-extrabold">{tMasks("noPhoto")}</span>
      </div>
    );
  }

  return (
    <section aria-label={t("gallery", { name })}>
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3" tabIndex={0}>
        {images.map((image, index) => (
          <li
            key={image.src}
            className="relative aspect-square w-full shrink-0 snap-center overflow-hidden rounded-card border-4 border-ink shadow-sticker"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              sizes="(min-width: 1024px) 512px, 100vw"
              className="object-cover"
            />
            {images.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded-full border-[3px] border-ink bg-cream px-3 py-0.5 text-sm font-extrabold">
                {t("photo", { number: index + 1, total: images.length })}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
