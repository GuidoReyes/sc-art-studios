import { BRAND_ICON_PATHS, type BrandIconName } from "./brandPaths";

interface BrandIconProps {
  name: BrandIconName;
  className?: string;
}

/** Ícono de marca decorativo: el texto accesible lo pone el enlace que lo contiene. */
export function BrandIcon({ name, className = "size-5" }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d={BRAND_ICON_PATHS[name]} />
    </svg>
  );
}
