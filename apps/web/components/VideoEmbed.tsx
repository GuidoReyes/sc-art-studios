import { useTranslations } from "next-intl";
import type { MaskVideoDto } from "@sc-art-studio/shared";

const PLATFORM_NAME: Record<MaskVideoDto["platform"], string> = {
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
};

/**
 * Reproductor oficial de cada plataforma (dominios permitidos en frame-src de la CSP).
 * YouTube va por youtube-nocookie: no deja cookies hasta que se reproduce.
 */
export function embedUrl({ platform, externalId, url }: Pick<MaskVideoDto, "platform" | "externalId" | "url">): string {
  switch (platform) {
    case "YOUTUBE":
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(externalId)}`;
    case "TIKTOK":
      return `https://www.tiktok.com/embed/v2/${encodeURIComponent(externalId)}`;
    case "INSTAGRAM":
      // La API guarda la URL canónica con barra final: https://www.instagram.com/reel/CODE/
      return `${url}embed`;
  }
}

interface VideoEmbedProps {
  video: Pick<MaskVideoDto, "platform" | "externalId" | "url" | "title">;
  className?: string;
}

export function VideoEmbed({ video, className = "" }: VideoEmbedProps) {
  const t = useTranslations("Video");
  const platform = PLATFORM_NAME[video.platform];
  // YouTube es horizontal; TikTok e Instagram, verticales.
  const aspect = video.platform === "YOUTUBE" ? "aspect-video" : "aspect-[9/16] max-h-[640px]";

  return (
    <figure className={`flex flex-col gap-2 ${className}`}>
      <div className={`overflow-hidden rounded-card border-4 border-ink bg-ink shadow-sticker ${aspect}`}>
        <iframe
          src={embedUrl(video)}
          title={t("embedTitle", { title: video.title })}
          loading="lazy"
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full"
        />
      </div>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 font-extrabold">
        <span>{video.title}</span>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple underline underline-offset-4">
          {t("watchOn", { platform })}
          <span className="sr-only"> {t("newTab")}</span>
        </a>
      </figcaption>
    </figure>
  );
}
