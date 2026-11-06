// /api/admin/stories (tarea 14). El cuerpo se sanitiza aquí, antes de guardarse (capa 3).
import type { RequestHandler, Router } from "express";
import multer from "multer";
import { COVER_MAX_BYTES } from "../../config.js";
import { UnsupportedImageError, processCoverImage } from "../../lib/images.js";
import type { ReferenceStorage } from "../../lib/storage.js";
import { z } from "zod";
import { sanitizeRichText } from "../../lib/richText.js";
import { slugify } from "../../lib/slug.js";
import type { AdminStoryStore } from "../../repositories/admin/stories.js";
import { pageQueryShape } from "../public.js";
import { actorOf, createCrudRouter } from "./crud.js";
import { IdParamsSchema, NOT_EMPTY_MESSAGE, notEmpty, nullableDate, reference, slugField, text } from "./fields.js";

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: COVER_MAX_BYTES, files: 1, fields: 0, parts: 1 },
}).single("cover");

const parseUpload: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (!error) return next();
    if (!(error instanceof multer.MulterError)) return next(error);
    if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "La portada pesa más de 8 MB" });
    return res.status(400).json({ error: "Solicitud inválida" });
  });
};

/** Bucket público de R2 para las portadas; sin él la ruta responde 503. */
export interface StoryMedia {
  storage: ReferenceStorage;
  publicUrl: string;
}

export function createAdminStoriesRouter(store: AdminStoryStore, media?: StoryMedia): Router {
  const router = createCrudRouter(store, { query: QuerySchema, create: CreateSchema, update: UpdateSchema });

  // Portada (tarea 41): sharp la recorta a 1200x630 WebP y le quita el EXIF antes de subirla a R2.
  router.post("/:id/cover", parseUpload, async (req, res) => {
    const { id } = IdParamsSchema.parse(req.params);
    if (!media) return res.status(503).json({ error: "Las portadas necesitan R2 configurado" });
    if (!req.file) return res.status(400).json({ error: "Falta la imagen de portada" });
    const current = await store.get(id);
    if (!current) return res.status(404).json({ error: "No encontrado" });
    let image;
    try {
      image = await processCoverImage(req.file.buffer);
    } catch (error) {
      if (error instanceof UnsupportedImageError) return res.status(415).json({ error: error.message });
      throw error;
    }
    // Clave nueva en cada subida: así la CDN no sirve la portada vieja desde caché.
    const key = `stories/${id}-${Date.now()}.${image.extension}`;
    await media.storage.put(key, image.data, image.contentType);
    const updated = await store.update(id, { coverR2Key: key }, actorOf(req, res));
    const previous = current.coverR2Key;
    if (previous && previous !== key) await media.storage.remove(previous).catch(() => undefined);
    res.json({ data: updated });
  });

  return router;
}
