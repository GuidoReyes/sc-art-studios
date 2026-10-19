"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "./NavLink";
import type { NavItem } from "./Header";

interface MobileMenuProps {
  items: readonly NavItem[];
  /** El selector de idioma se renderiza en el servidor y se pasa ya armado. */
  localeSwitcher: ReactNode;
}

const PANEL_ID = "menu-movil";

export function MobileMenu({ items, localeSwitcher }: MobileMenuProps) {
  const t = useTranslations("Nav");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex size-11 items-center justify-center rounded-full border-[3px] border-ink bg-orange focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {isOpen ? <X aria-hidden="true" strokeWidth={3} /> : <Menu aria-hidden="true" strokeWidth={3} />}
        <span className="sr-only">{isOpen ? t("closeMenu") : t("menu")}</span>
      </button>

      <nav
        id={PANEL_ID}
        aria-label={t("label")}
        hidden={!isOpen}
        className="absolute inset-x-0 top-full z-40 border-b-4 border-ink bg-cream px-4 pb-6 pt-2 shadow-[0_6px_0_0_var(--color-ink)]"
      >
        <ul className="flex flex-col">
          {items.map(({ href, label }) => (
            <li key={href} className="border-b-2 border-dashed border-ink/30 last:border-none">
              <NavLink
                href={href}
                onClick={() => setIsOpen(false)}
                className="block py-3 font-display text-2xl"
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-4">{localeSwitcher}</div>
      </nav>
    </div>
  );
}
