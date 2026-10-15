import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: routing.locales.map((l) => `/${l}/admin`) },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
