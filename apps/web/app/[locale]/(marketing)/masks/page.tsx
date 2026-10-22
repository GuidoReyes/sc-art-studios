import type { Metadata } from "next";
import type { MaskListResponse } from "@sc-art-studio/shared";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MaskCard } from "@/components/MaskCard";
import { Link } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { apiGet } from "@/lib/api";
import { animalsOf, toMaskSummary } from "@/lib/catalog";
import { CATALOG_PAGE_SIZE, PUBLIC_STATUSES, type CatalogFilters, catalogQuery, parseCatalogFilters } from "@/lib/catalogQuery";
import { buildAlternates } from "@/lib/seo";

// Para armar la lista de animales del filtro con una sola llamada (tope de la API).
const ANIMAL_POOL = 48;

const STATUS_KEY = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
  COMMISSION_EXAMPLE: "commissionExample",
} as const;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Pages" });
  const tCatalog = await getTranslations({ locale, namespace: "Catalog" });
  return { title: t("masks"), description: tCatalog("intro"), alternates: buildAlternates("/masks", locale) };
}

const CHIP =
  "inline-flex rounded-full border-[3px] border-ink px-4 py-1 font-extrabold transition-transform hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none";

function FilterChip({ isActive, query, children }: { isActive: boolean; query: Record<string, string>; children: string }) {
  return (
    <Link
      href={{ pathname: "/masks", query }}
      aria-current={isActive ? "true" : undefined}
      className={`${CHIP} ${isActive ? "bg-ink text-cream" : "bg-cream"}`}
      scroll={false}
    >
      {children}
    </Link>
  );
}

export default async function MasksPage({ params, searchParams }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const filters: CatalogFilters = parseCatalogFilters(await searchParams);
  const [t, tPages, tStatus] = await Promise.all([
    getTranslations("Catalog"),
    getTranslations("Pages"),
    getTranslations("Masks.status"),
  ]);

  const [list, everything] = await Promise.all([
    apiGet<MaskListResponse>("/api/masks", {
      status: filters.status,
      animal: filters.animal,
      page: filters.page,
      limit: CATALOG_PAGE_SIZE,
    }),
    apiGet<MaskListResponse>("/api/masks", { limit: ANIMAL_POOL }),
  ]);
  const masks = (list?.data ?? []).map((mask) => toMaskSummary(mask, locale));
  const total = list?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const animals = animalsOf(everything?.data ?? []);
  const hasFilters = filters.status !== undefined || filters.animal !== undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl sm:text-6xl">{tPages("masks")}</h1>
        <p className="text-lg font-semibold">{t("intro")}</p>
      </header>

      <nav aria-label={t("filtersLabel")} className="mt-8 flex flex-col gap-4 rounded-card border-4 border-ink bg-cream p-5 shadow-sticker">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 font-display text-lg">{t("status")}</span>
          <FilterChip isActive={!filters.status} query={catalogQuery(filters, { status: undefined })}>
            {t("all")}
          </FilterChip>
          {PUBLIC_STATUSES.map((status) => (
            <FilterChip key={status} isActive={filters.status === status} query={catalogQuery(filters, { status })}>
              {tStatus(STATUS_KEY[status])}
            </FilterChip>
          ))}
        </div>
        {animals.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 font-display text-lg">{t("animal")}</span>
            <FilterChip isActive={!filters.animal} query={catalogQuery(filters, { animal: undefined })}>
              {t("all")}
            </FilterChip>
            {animals.map((animal) => (
              <FilterChip key={animal} isActive={filters.animal === animal} query={catalogQuery(filters, { animal })}>
                {animal}
              </FilterChip>
            ))}
          </div>
        )}
      </nav>

      <h2 className="mt-8 font-extrabold">{t("count", { count: total })}</h2>

      {masks.length > 0 ? (
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {masks.map((mask) => (
            <li key={mask.slug}>
              <MaskCard mask={mask} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 flex flex-col items-start gap-4 rounded-card border-4 border-dashed border-ink p-8">
          <p className="text-lg font-semibold">{t("empty")}</p>
          {hasFilters && (
            <Link href="/masks" className={`${CHIP} bg-purple text-cream`}>
              {t("clear")}
            </Link>
          )}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label={t("paginationLabel")} className="mt-10 flex items-center justify-between gap-4 font-extrabold">
          {filters.page > 1 ? (
            <Link href={{ pathname: "/masks", query: catalogQuery(filters, { page: filters.page - 1 }) }} className={`${CHIP} bg-cream`}>
              ← {t("previous")}
            </Link>
          ) : (
            <span />
          )}
          <span>{t("page", { page: filters.page, pages })}</span>
          {filters.page < pages ? (
            <Link href={{ pathname: "/masks", query: catalogQuery(filters, { page: filters.page + 1 }) }} className={`${CHIP} bg-cream`}>
              {t("next")} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
