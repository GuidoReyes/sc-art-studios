import { Router } from "express";
import { z } from "zod";
import type { MaskDetailResponse, MaskListResponse, PublicMaskStatus } from "@sc-art-studio/shared";
import type { MaskRepository } from "../repositories/masks.js";
import { SlugParamsSchema, noStoreByDefault, pageQueryShape, sendNotFound, sendPublic } from "./public.js";

// DRAFT no está: pedirlo es un 400, igual que cualquier estado que no exista.
const PUBLIC_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "COMMISSION_EXAMPLE"] as const satisfies readonly PublicMaskStatus[];
const MAX_ANIMAL_LENGTH = 80; // igual que la columna Mask.animal

// `.strict()`: un parámetro desconocido es un error, no algo que se ignora en silencio.
const ListQuerySchema = z
  .object({
    status: z.enum(PUBLIC_STATUSES).optional(),
    animal: z.string().trim().min(1).max(MAX_ANIMAL_LENGTH).optional(),
    ...pageQueryShape,
  })
  .strict();

export function createMasksRouter(masks: MaskRepository): Router {
  const router = Router();
  router.use(noStoreByDefault);

  router.get("/", async (req, res) => {
    const query = ListQuerySchema.parse(req.query);
    const { items, total } = await masks.list(query);
    const body: MaskListResponse = { data: items, meta: { total, page: query.page, limit: query.limit } };
    sendPublic(res, body);
  });

  router.get("/:slug", async (req, res) => {
    const { slug } = SlugParamsSchema.parse(req.params);
    const mask = await masks.findBySlug(slug);
    if (!mask) return sendNotFound(res);
    const body: MaskDetailResponse = { data: mask };
    sendPublic(res, body);
  });

  return router;
}
