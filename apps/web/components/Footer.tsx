import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SOCIAL_LINKS } from "@/lib/site";
import { SocialLinks } from "./SocialLinks";

const LEGAL_LINKS = [
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
  { href: "/shipping", key: "shipping" },
] as const;

export function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="border-t-4 border-ink bg-ink text-cream">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Link href="/" className="w-fit font-display text-3xl leading-none">
            SC Art <span className="text-pink">Studio</span>
          </Link>
          <p className="font-semibold">{t("location")}</p>
          <p className="max-w-sm">{t("adultNotice")}</p>
        </div>

        <div className="flex flex-col gap-5 sm:items-end">
          {SOCIAL_LINKS.length > 0 && (
            <nav aria-label={t("socialLabel")}>
              <SocialLinks links={SOCIAL_LINKS} tone="dark" />
            </nav>
          )}
          <nav aria-label={t("legalLabel")}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 font-extrabold">
              {LEGAL_LINKS.map(({ href, key }) => (
                <li key={key}>
                  <Link href={href} className="decoration-pink decoration-4 underline-offset-[6px] hover:underline">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t-2 border-cream/20">
        <p className="mx-auto max-w-5xl px-4 py-4 text-sm">
          © {new Date().getFullYear()} SC Art Studio · {t("rights")}
        </p>
      </div>
    </footer>
  );
}
