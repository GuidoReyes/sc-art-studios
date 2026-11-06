// POST /api/admin/oembed/resolve (tarea 41): vista previa del video antes de guardarlo.
import { Router } from "express";
import { z } from "zod";
import { InvalidVideoUrlError, type OEmbedResolver } from "../../services/oembed.service.js";

const BodySchema = z.object({ url: z.string().trim().min(1).max(512) }).strict();

export function createAdminOEmbedRouter(resolve: OEmbedResolver): Router {
  const router = Router();
  router.post("/resolve", async (req, res) => {
    const { url } = BodySchema.parse(req.body ?? {});
    try {
      res.json({ data: await resolve(url) });
    } catch (error) {
      if (error instanceof InvalidVideoUrlError) return res.status(400).json({ error: error.message });
      throw error;
    }
  });
  return router;
}
