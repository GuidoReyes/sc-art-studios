"use client";

import { type KeyboardEvent, type ReactNode, type TouchEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

// Modo libro (PRD §3), portado del prototipo "Scarlet Mask Studio": cada hoja gira sobre el lomo.
// Dos páginas por vista en pantallas anchas, una en el móvil.

export interface BookPage {
  title: string;
  content: ReactNode;
  /** Portada y contraportada: sin número de página. */
  isCover?: boolean;
}

const PAGE_RATIO = 0.7; // ancho ÷ alto de una página
const SINGLE_PAGE_BELOW_PX = 720;
const SWIPE_MIN_PX = 40;
const FLIP_MS = 950;

interface Face {
  page: number | null;
}

function buildLeaves(total: number, isSingle: boolean): { front: Face; back: Face }[] {
  if (isSingle) return Array.from({ length: total }, (_, i) => ({ front: { page: i }, back: { page: null } }));
  return Array.from({ length: Math.ceil(total / 2) }, (_, k) => ({
    front: { page: 2 * k },
    back: { page: 2 * k + 1 < total ? 2 * k + 1 : null },
  }));
}

/** Páginas visibles con `flipped` hojas volteadas. */
export function visiblePages(flipped: number, total: number, isSingle: boolean): number[] {
  if (isSingle) return [flipped];
  const leaves = Math.ceil(total / 2);
  return [flipped > 0 ? 2 * flipped - 1 : -1, flipped < leaves ? 2 * flipped : -1].filter((p) => p >= 0 && p < total);
}

export function BookViewer({ pages, label }: { pages: readonly BookPage[]; label: string }) {
  const t = useTranslations("Book");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; isSingle: boolean } | null>(null);
  const [flipped, setFlipped] = useState(0);
  const total = pages.length;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const isSingle = width < SINGLE_PAGE_BELOW_PX;
      const pageWidth = Math.floor(isSingle ? Math.min(width, height * PAGE_RATIO) : Math.min(width / 2, height * PAGE_RATIO));
      setSize((prev) => {
        if (prev && prev.isSingle !== isSingle) {
          // Al cambiar de modo se conserva la página que se estaba leyendo.
          setFlipped((current) => {
            const page = visiblePages(current, total, prev.isSingle)[0] ?? 0;
            return isSingle ? page : Math.floor((page + 1) / 2);
          });
        }
        return { width: pageWidth, isSingle };
      });
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [total]);

  const isSingle = size?.isSingle ?? false;
  const leaves = buildLeaves(total, isSingle);
  const maxFlipped = isSingle ? total - 1 : leaves.length;
  const visible = visiblePages(flipped, total, isSingle);
  const go = (target: number) => setFlipped(Math.max(0, Math.min(maxFlipped, target)));

  const titles = [...new Set(visible.map((p) => pages[p].title))].join(" · ");
  const numbered = visible.filter((p) => !pages[p].isCover);
  const where = numbered.length
    ? t("pageOf", { pages: numbered.map((p) => p).join("–"), total: total - 2 })
    : visible[0] === 0
      ? t("cover")
      : t("backCover");

  function onKeyDown(event: KeyboardEvent) {
    const moves: Record<string, number> = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 };
    if (event.key in moves) {
      event.preventDefault();
      go(flipped + moves[event.key]);
    } else if (event.key === "Home") go(0);
    else if (event.key === "End") go(maxFlipped);
  }

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (event: TouchEvent) => {
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) go(flipped + (dx < 0 ? 1 : -1));
  };

  const shift = !isSingle && flipped === 0 ? "-translate-x-1/4" : !isSingle && flipped === leaves.length ? "translate-x-1/4" : "";

  return (
    <section
      aria-roledescription={t("roleDescription")}
      aria-label={label}
      className="flex flex-col items-center gap-4 rounded-card border-4 border-ink bg-[radial-gradient(120%_90%_at_50%_40%,#43296a,#2e1b45)] px-4 pb-5 pt-6 shadow-sticker-lg"
      onKeyDown={onKeyDown}
    >
      <div ref={wrapRef} className="grid h-[min(70vh,540px)] w-full place-items-center overflow-hidden md:h-[min(78vh,760px)]">
        {size && (
          <div
            className={`relative [perspective:2600px] transition-transform duration-700 motion-reduce:transition-none ${shift}`}
            style={{ width: isSingle ? size.width : size.width * 2, height: Math.floor(size.width / PAGE_RATIO) }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {leaves.map((leaf, i) => {
              const isFlipped = i < flipped;
              return (
                <div
                  key={`${isSingle}-${i}`}
                  className={`absolute top-0 h-full [transform-style:preserve-3d] [transform-origin:left_center] transition-transform ease-[cubic-bezier(.645,.045,.355,1)] motion-reduce:transition-none ${
                    isSingle ? "left-0 w-full" : "left-1/2 w-1/2"
                  } ${isFlipped ? "[transform:rotateY(-180deg)]" : ""} ${isSingle && isFlipped ? "invisible delay-[950ms]" : ""}`}
                  style={{ zIndex: isFlipped ? i + 1 : leaves.length - i, transitionDuration: `${FLIP_MS}ms` }}
                >
                  {(["front", "back"] as const).map((side) => {
                    const page = leaf[side].page;
                    const isVisible = page !== null && visible.includes(page);
                    return (
                      <div
                        key={side}
                        inert={!isVisible}
                        aria-hidden={!isVisible}
                        className={`absolute inset-0 overflow-hidden bg-[#fffdf8] shadow-[0_6px_16px_rgba(10,4,20,.22)] [backface-visibility:hidden] [container-type:size] ${
                          side === "back" ? "[transform:rotateY(180deg)] rounded-l-[14px]" : isSingle ? "rounded-[14px]" : "rounded-r-[14px]"
                        }`}
                      >
                        {page !== null && (
                          <div className="absolute inset-0 text-[3.35cqw] leading-normal">
                            {pages[page].content}
                            {!pages[page].isCover && (
                              <span className="absolute inset-x-0 bottom-[1.1em] text-center text-[.78em] font-extrabold tracking-[.12em] opacity-55">
                                {page}
                              </span>
                            )}
                          </div>
                        )}
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-0 ${
                            side === "front"
                              ? "bg-[linear-gradient(90deg,rgba(27,27,27,.2),rgba(27,27,27,.05)_6%,transparent_14%)]"
                              : "bg-[linear-gradient(270deg,rgba(27,27,27,.2),rgba(27,27,27,.05)_6%,transparent_14%)]"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <nav aria-label={t("controls")} className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => go(flipped - 1)}
          disabled={flipped === 0}
          aria-label={t("previous")}
          className="grid size-14 place-items-center rounded-full border-[3px] border-ink bg-cream text-ink shadow-[0_4px_0_#1b1b1b] transition-transform hover:-translate-y-0.5 focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-turquoise disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transition-none"
        >
          <ChevronLeft aria-hidden="true" className="size-7" strokeWidth={3} />
        </button>
        <p aria-live="polite" className="flex min-w-0 flex-col text-center leading-tight text-cream">
          <span className="max-w-[46vw] truncate font-display text-lg">{titles}</span>
          {where !== titles && <span className="text-xs font-extrabold uppercase tracking-[.14em] opacity-80">{where}</span>}
        </p>
        <button
          type="button"
          onClick={() => go(flipped + 1)}
          disabled={flipped === maxFlipped}
          aria-label={t("next")}
          className="grid size-14 place-items-center rounded-full border-[3px] border-ink bg-pink-deep text-cream shadow-[0_4px_0_#1b1b1b] transition-transform hover:-translate-y-0.5 focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-turquoise disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transition-none"
        >
          <ChevronRight aria-hidden="true" className="size-7" strokeWidth={3} />
        </button>
      </nav>
    </section>
  );
}
