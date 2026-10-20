"use client";

import type { ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";

type NavHref = "/masks" | "/custom" | "/stories" | "/videos" | "/contact";

interface NavLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href: NavHref;
}

/** Enlace de navegación que marca la sección actual (también en sus subpáginas, p. ej. /masks/[slug]). */
export function NavLink({ href, className = "", ...rest }: NavLinkProps) {
  const pathname = usePathname();
  const isCurrent = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      className={`decoration-pink decoration-4 underline-offset-[6px] hover:underline aria-[current=page]:underline ${className}`}
      {...rest}
    />
  );
}
