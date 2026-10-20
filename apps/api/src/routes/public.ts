// Lo que comparten las rutas públicas (PRD §4.5): paginación, slug, caché y 404.
// El rate limit general de /api ya las cubre (middleware/security.ts).
import type { RequestHandler, Response } from "express";
import { z } from "zod";
import { PUBLIC_CACHE_CONTROL, PUBLIC_MAX_PAGE, PUBLIC_MAX_PAGE_SIZE, PUBLIC_PAGE_SIZE } from "../config.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120; // igual que las columnas Mask.slug y Story.slug

/** Campos de paginación para `z.object({...pageQueryShape, ...}).strict()`. */
export const pageQueryShape = {
  page: z.coerce.number().int().min(1).max(PUBLIC_MAX_PAGE).default(1),
  limit: z.coerce.number().int().min(1).max(PUBLIC_MAX_PAGE_SIZE).default(PUBLIC_PAGE_SIZE),
};

export const SlugParamsSchema = z.object({ slug: z.string().max(MAX_SLUG_LENGTH).regex(SLUG_PATTERN) }).strict();

// Solo las respuestas 200 se guardan en la CDN; un 400 o 404 no debe quedarse en caché.
export const noStoreByDefault: RequestHandler = (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};

export function sendPublic(res: Response, body: unknown): void {
  res.set("Cache-Control", PUBLIC_CACHE_CONTROL).json(body);
}

export function sendNotFound(res: Response): void {
  res.status(404).json({ error: "No encontrado" });
}
