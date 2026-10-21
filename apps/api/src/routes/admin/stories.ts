// /api/admin/stories (tarea 14). El cuerpo se sanitiza aquí, antes de guardarse (capa 3).
import type { Router } from "express";
import { z } from "zod";
import { sanitizeRichText } from "../../lib/richText.js";
import { slugify } from "../../lib/slug.js";
import type { AdminStoryStore } from "../../repositories/admin/stories.js";
import { pageQueryShape } from "../public.js";
import { createCrudRouter } from "./crud.js";
import { NOT_EMPTY_MESSAGE, notEmpty, nullableDate, reference, slugField, text } from "./fields.js";

// MEDIUMTEXT aguanta 16 MB; el tope real lo pone el límite de 1 MB del cuerpo JSON.
const BODY_MAX = 200_000;

const richText = z
  .string()
  .max(BODY_MAX)
  .transform(sanitizeRichText)
  .refine((html) => html !== "", "El texto quedó vacío después de limpiarlo");

const fields = {
  slug: slugField,
  titleEs: text(200),
  titleEn: text(200),
  bodyEs: richText,
  bodyEn: richText,
  maskId: reference,
  publishedAt: nullableDate,
};

const { slug, maskId, publishedAt, ...required } = fields;

const CreateSchema = z
  .object({ ...required, slug: slug.optional(), maskId: maskId.optional(), publishedAt: publishedAt.optional() })
  .strict()
  .transform((input) => ({ ...input, slug: input.slug ?? slugify(input.titleEn) }))
  .refine((input) => input.slug !== "", { message: "El título en inglés no sirve para armar el slug", path: ["slug"] });

const UpdateSchema = z.object(fields).partial().strict().refine(notEmpty, NOT_EMPTY_MESSAGE);

const QuerySchema = z.object(pageQueryShape).strict();

export const createAdminStoriesRouter = (store: AdminStoryStore): Router =>
  createCrudRouter(store, { query: QuerySchema, create: CreateSchema, update: UpdateSchema });
