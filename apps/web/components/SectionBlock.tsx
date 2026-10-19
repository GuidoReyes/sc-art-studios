import type { ReactNode } from "react";
import { SURFACE_CLASSES, type SurfaceName } from "@/lib/palette";

interface SectionBlockProps {
  color: SurfaceName;
  children: ReactNode;
  /** Tarjeta con borde y esquinas redondas en vez de franja a todo lo ancho. */
  isCard?: boolean;
  id?: string;
  "aria-labelledby"?: string;
  className?: string;
}

/** Bloque de color sólido de la paleta; el color de texto sale de SURFACES para pasar WCAG AA. */
export function SectionBlock({ color, children, isCard = false, className = "", ...rest }: SectionBlockProps) {
  const shape = isCard ? "rounded-card border-4 border-ink shadow-sticker-lg" : "border-y-4 border-ink";
  return (
    <section className={`${SURFACE_CLASSES[color]} ${shape} ${className}`} {...rest}>
      <div className={isCard ? "px-6 py-8 sm:px-10 sm:py-10" : "mx-auto max-w-5xl px-4 py-12 sm:py-16"}>{children}</div>
    </section>
  );
}
