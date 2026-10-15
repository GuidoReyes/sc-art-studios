import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

const NAV_ITEMS = [
  { href: "/masks", key: "masks" },
  { href: "/custom", key: "custom" },
  { href: "/stories", key: "stories" },
  { href: "/contact", key: "contact" },
] as const;

export function Header() {
  const t = useTranslations("Nav");
  return (
    <header className="border-b-4 border-ink bg-cream">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:border-4 focus:border-ink focus:bg-cream focus:px-4 focus:py-2 focus:font-extrabold"
      >
        {t("skip")}
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-display text-2xl">
          SC Art Studio
        </Link>
        <nav aria-label={t("label")} className="flex flex-wrap items-center gap-x-4 gap-y-2 font-extrabold">
          {NAV_ITEMS.map(({ href, key }) => (
            <Link key={key} href={href} className="underline-offset-4 hover:underline">
              {t(key)}
            </Link>
          ))}
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
