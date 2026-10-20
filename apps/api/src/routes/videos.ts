import { Router } from "express";
import { z } from "zod";
import type { VideoListResponse } from "@sc-art-studio/shared";
import type { VideoRepository } from "../repositories/videos.js";
import { noStoreByDefault, pageQueryShape, sendPublic } from "./public.js";

// Los ids de Prisma son cuid: validar el formato evita consultar con cualquier texto.
const ListQuerySchema = z.object({ maskId: z.cuid().optional(), ...pageQueryShape }).strict();

export function createVideosRouter(videos: VideoRepository): Router {
  const router = Router();
  router.use(noStoreByDefault);

  router.get("/", async (req, res) => {
    const query = ListQuerySchema.parse(req.query);
    const { items, total } = await videos.list(query);
    const body: VideoListResponse = { data: items, meta: { total, page: query.page, limit: query.limit } };
    sendPublic(res, body);
  });

  return router;
}
