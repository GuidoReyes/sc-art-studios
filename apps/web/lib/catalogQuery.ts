// Filtros del catálogo en la URL (?status=SOLD&animal=Jaguar&page=2). Lo que no es válido se ignora:
// un enlace viejo o editado a mano muestra el catálogo completo en vez de un error.
import { z } from "zod";
import type { PublicMaskStatus } from "./mask";

export const CATALOG_PAGE_SIZE = 12;
export const PUBLIC_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "COMMISSION_EXAMPLE"] as const satisfies readonly PublicMaskStatus[];
const MAX_ANIMAL_LENGTH = 80; // igual que Mask.animal
const MAX_PAGE = 100;

export interface CatalogFilters {
  status?: PublicMaskStatus;
  animal?: string;
  page: number;
}

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const FiltersSchema = z.object({
  status: z.preprocess(first, z.enum(PUBLIC_STATUSES).optional()).catch(undefined),
  animal: z.preprocess(first, z.string().trim().min(1).max(MAX_ANIMAL_LENGTH).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(MAX_PAGE)).catch(1),
});

export function parseCatalogFilters(searchParams: Record<string, string | string[] | undefined>): CatalogFilters {
  const { status, animal, page } = FiltersSchema.parse(searchParams);
  return { status, animal, page: page ?? 1 };
}

/** Query de un enlace del catálogo: cambia un filtro y vuelve a la página 1, salvo que se pida otra. */
export function catalogQuery(filters: CatalogFilters, change: Partial<CatalogFilters>): Record<string, string> {
  const next = { ...filters, page: 1, ...change };
  return Object.fromEntries(
    Object.entries({ status: next.status, animal: next.animal, page: next.page > 1 ? next.page : undefined })
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}
