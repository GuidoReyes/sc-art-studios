import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CartIndicator } from "./CartIndicator";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";

const NAV_ITEMS = [
  { href: "/masks", key: "masks" },
  { href: "/about", key: "about" },
  { href: "/custom", key: "custom" },
  { href: "/stories", key: "stories" },
  { href: "/videos", key: "videos" },
  { href: "/contact", key: "contact" },
] as const;

export interface NavItem {
  href: (typeof NAV_ITEMS)[number]["href"];
  label: string;
}

interface HeaderProps {
  /** Hasta que exista el carrito de Shopify se muestra vacío. */
  cartCount?: number;
}

export function Header({ cartCount = 0 }: HeaderProps) {
  const t = useTranslations("Nav");
  const items: NavItem[] = NAV_ITEMS.map(({ href, key }) => ({ href, label: t(key) }));

  return (
    <header className="relative border-b-4 border-ink bg-cream">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:border-4 focus:border-ink focus:bg-cream focus:px-4 focus:py-2 focus:font-extrabold"
      >
        {t("skip")}
      </a>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="font-display text-2xl leading-none transition-transform duration-200 hover:-rotate-2 sm:text-3xl motion-reduce:transition-none"
        >
          SC Art <span className="text-pink-deep">Studio</span>
        </Link>

        <nav aria-label={t("label")} className="hidden items-center gap-5 font-extrabold md:flex">
          {items.map(({ href, label }) => (
            <NavLink key={href} href={href}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher className="hidden md:inline-flex" />
          <CartIndicator count={cartCount} />
          <MobileMenu items={items} localeSwitcher={<LocaleSwitcher />} />
        </div>
      </div>
    </header>
  );
}
