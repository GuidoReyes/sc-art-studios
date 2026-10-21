// /api/admin/videos (tarea 14). El admin pega el enlace; plataforma e id se deducen de él.
import type { Router } from "express";
import { z } from "zod";
import { parseVideoUrl } from "../../lib/videoUrls.js";
import type { AdminVideoStore } from "../../repositories/admin/videos.js";
import { pageQueryShape } from "../public.js";
import { createCrudRouter } from "./crud.js";
import { NOT_EMPTY_MESSAGE, httpsUrl, notEmpty, nullableDate, reference, text } from "./fields.js";

const videoUrl = z
  .string()
  .trim()
  .max(512)
  .transform((value, ctx) => {
    const parsed = parseVideoUrl(value);
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: "Pega el enlace completo de un video de YouTube, TikTok o Instagram" });
      return z.NEVER;
    }
    return parsed;
  });

const optional = {
  thumbnailUrl: httpsUrl.nullable(),
  maskId: reference,
  storyId: reference,
  publishedAt: nullableDate,
};

// `url` se reemplaza por { platform, externalId, url } ya normalizados.
const CreateSchema = z
  .object({ url: videoUrl, title: text(300), ...z.object(optional).partial().shape })
  .strict()
  .transform(({ url, ...rest }) => ({ ...rest, ...url }));

const UpdateSchema = z
  .object({ url: videoUrl, title: text(300), ...optional })
  .partial()
  .strict()
  .refine(notEmpty, NOT_EMPTY_MESSAGE)
  .transform(({ url, ...rest }) => ({ ...rest, ...url }));

const QuerySchema = z.object({ maskId: z.cuid().optional(), storyId: z.cuid().optional(), ...pageQueryShape }).strict();

export const createAdminVideosRouter = (store: AdminVideoStore): Router =>
  createCrudRouter(store, { query: QuerySchema, create: CreateSchema, update: UpdateSchema });
