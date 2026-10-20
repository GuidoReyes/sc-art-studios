import { Router } from "express";
import { z } from "zod";
import type { MaskDetailResponse, MaskListResponse, PublicMaskStatus } from "@sc-art-studio/shared";
import { MASKS_MAX_PAGE, MASKS_MAX_PAGE_SIZE, MASKS_PAGE_SIZE, PUBLIC_CACHE_CONTROL } from "../config.js";
import type { MaskRepository } from "../repositories/masks.js";

// DRAFT no está: pedirlo es un 400, igual que cualquier estado que no exista.
const PUBLIC_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "COMMISSION_EXAMPLE"] as const satisfies readonly PublicMaskStatus[];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120; // igual que la columna Mask.slug
const MAX_ANIMAL_LENGTH = 80; // igual que la columna Mask.animal

// `.strict()`: un parámetro desconocido es un error, no algo que se ignora en silencio.
const ListQuerySchema = z
  .object({
    status: z.enum(PUBLIC_STATUSES).optional(),
    animal: z.string().trim().min(1).max(MAX_ANIMAL_LENGTH).optional(),
    page: z.coerce.number().int().min(1).max(MASKS_MAX_PAGE).default(1),
    limit: z.coerce.number().int().min(1).max(MASKS_MAX_PAGE_SIZE).default(MASKS_PAGE_SIZE),
  })
  .strict();

const SlugParamsSchema = z.object({ slug: z.string().max(MAX_SLUG_LENGTH).regex(SLUG_PATTERN) }).strict();

// Públicas (PRD §4.5). El rate limit general de /api ya las cubre (middleware/security.ts).
export function createMasksRouter(masks: MaskRepository): Router {
  const router = Router();

  // Solo las respuestas 200 se guardan en la CDN; un 400 o 404 no debe quedarse en caché.
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  router.get("/", async (req, res) => {
    const query = ListQuerySchema.parse(req.query);
    const { items, total } = await masks.list(query);
    const body: MaskListResponse = { data: items, meta: { total, page: query.page, limit: query.limit } };
    res.set("Cache-Control", PUBLIC_CACHE_CONTROL).json(body);
  });

  router.get("/:slug", async (req, res) => {
    const { slug } = SlugParamsSchema.parse(req.params);
    const mask = await masks.findBySlug(slug);
    if (!mask) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    const body: MaskDetailResponse = { data: mask };
    res.set("Cache-Control", PUBLIC_CACHE_CONTROL).json(body);
  });

  return router;
}
