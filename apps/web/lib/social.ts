export type SocialPlatform = "youtube" | "tiktok" | "instagram" | "facebook";

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export const SOCIAL_PLATFORM_NAMES: Record<SocialPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Deja solo enlaces https: las URLs vienen del admin (SocialAccount) y se pintan en un href. */
export function safeSocialLinks(links: readonly SocialLink[]): SocialLink[] {
  return links.filter((link) => isHttpsUrl(link.url));
}
