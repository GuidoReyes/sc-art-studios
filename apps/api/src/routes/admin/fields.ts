// Piezas de Zod para los formularios del admin. Los topes salen de las columnas de schema.prisma.
import { z } from "zod";
import { MAX_SLUG_LENGTH, SLUG_PATTERN } from "../../lib/slug.js";

export const IdParamsSchema = z.object({ id: z.cuid() }).strict();

export const slugField = z.string().trim().max(MAX_SLUG_LENGTH).regex(SLUG_PATTERN, "solo minúsculas, números y guiones");

export const text = (max: number) => z.string().trim().min(1).max(max);

/** Opcional y borrable: "" o null lo dejan vacío. */
export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);

export const reference = z.cuid().nullable();

/** ISO 8601 con zona horaria; null lo deja sin fecha. */
export const nullableDate = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullable();

export const httpsUrl = z.url({ protocol: /^https$/ }).max(512);

/**
 * Número que cabe en una columna Decimal(precision, scale), sin negativos:
 * decimal(10, 2) acepta hasta 99 999 999.99 con dos decimales como máximo.
 */
export function decimal(precision: number, scale: number) {
  const factor = 10 ** scale;
  const max = 10 ** (precision - scale) - 1 / factor;
  return z
    .number()
    .min(0)
    .max(max)
    .refine((value) => Math.abs(value * factor - Math.round(value * factor)) < 1e-6, `máximo ${scale} decimales`);
}

/** Un PUT sin campos no cambia nada: mejor avisar que responder 200 en silencio. */
export const notEmpty = (value: object) => Object.keys(value).length > 0;
export const NOT_EMPTY_MESSAGE = "No hay nada que cambiar";
