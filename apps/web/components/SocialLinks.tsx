import { useTranslations } from "next-intl";
import { safeSocialLinks, SOCIAL_PLATFORM_NAMES, type SocialLink } from "@/lib/social";
import { BrandIcon } from "./icons/BrandIcon";

interface SocialLinksProps {
  links: readonly SocialLink[];
  /** "dark" para fondos de tinta (el pie). */
  tone?: "light" | "dark";
  className?: string;
}

const TONE_CLASSES = {
  light: "border-ink bg-cream text-ink hover:bg-orange",
  dark: "border-cream bg-ink text-cream hover:bg-cream hover:text-ink",
} as const;

export function SocialLinks({ links, tone = "light", className = "" }: SocialLinksProps) {
  const t = useTranslations("Social");
  const safeLinks = safeSocialLinks(links);
  if (safeLinks.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {safeLinks.map(({ platform, url }) => (
        <li key={platform}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("visit", { platform: SOCIAL_PLATFORM_NAMES[platform] })}
            className={`inline-flex size-11 items-center justify-center rounded-full border-[3px] transition-[transform,background-color,color] duration-150 hover:-rotate-6 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-current motion-reduce:transition-none ${TONE_CLASSES[tone]}`}
          >
            <BrandIcon name={platform} />
          </a>
        </li>
      ))}
    </ul>
  );
}
