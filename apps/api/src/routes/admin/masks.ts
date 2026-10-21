// /api/admin/masks (tarea 14). Los borradores pueden ir incompletos: solo nombre, animal y descripción son obligatorios.
import type { Router } from "express";
import { z } from "zod";
import { QUOTE_MAX_SIDE_CM, QUOTE_MAX_WEIGHT_GRAMS } from "../../config.js";
import { slugify } from "../../lib/slug.js";
import type { AdminMaskStore } from "../../repositories/admin/masks.js";
import { pageQueryShape } from "../public.js";
import { createCrudRouter } from "./crud.js";
import { NOT_EMPTY_MESSAGE, decimal, notEmpty, nullableText, reference, slugField, text } from "./fields.js";

const MASK_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "COMMISSION_EXAMPLE", "DRAFT"] as const;
// Columnas TEXT de MySQL: 65 535 bytes, hasta 4 por carácter en utf8mb4.
const DESCRIPTION_MAX = 5_000;
const STORY_MAX = 10_000;

// Peso y medidas con los mismos topes del cotizador: lo que no cabe en un bulto de courier no se puede enviar.
const side = decimal(6, 1).positive().max(QUOTE_MAX_SIDE_CM).nullable();

const fields = {
  slug: slugField,
  nameEs: text(120),
  nameEn: text(120),
  animal: text(80),
  descriptionEs: text(DESCRIPTION_MAX),
  descriptionEn: text(DESCRIPTION_MAX),
  storyEs: nullableText(STORY_MAX),
  storyEn: nullableText(STORY_MAX),
  status: z.enum(MASK_STATUSES),
  priceUsd: decimal(10, 2).nullable(),
  priceGtq: decimal(12, 2).nullable(),
  weightGrams: z.number().int().positive().max(QUOTE_MAX_WEIGHT_GRAMS).nullable(),
  lengthCm: side,
  widthCm: side,
  heightCm: side,
  materialsCostGtq: decimal(10, 2).nullable(),
  laborHours: decimal(6, 2).nullable(),
  packagingProfileId: reference,
  featured: z.boolean(),
};

const { slug, nameEs, nameEn, animal, descriptionEs, descriptionEn, ...optional } = fields;

// Sin slug se arma con el nombre en inglés (el que más buscan los compradores).
const CreateSchema = z
  .object({ slug: slug.optional(), nameEs, nameEn, animal, descriptionEs, descriptionEn, ...z.object(optional).partial().shape })
  .strict()
  .transform((input) => ({ ...input, slug: input.slug ?? slugify(input.nameEn) }))
  .refine((input) => input.slug !== "", { message: "El nombre en inglés no sirve para armar el slug", path: ["slug"] });

const UpdateSchema = z.object(fields).partial().strict().refine(notEmpty, NOT_EMPTY_MESSAGE);

const QuerySchema = z.object({ status: z.enum(MASK_STATUSES).optional(), ...pageQueryShape }).strict();

export const createAdminMasksRouter = (store: AdminMaskStore): Router =>
  createCrudRouter(store, { query: QuerySchema, create: CreateSchema, update: UpdateSchema });
