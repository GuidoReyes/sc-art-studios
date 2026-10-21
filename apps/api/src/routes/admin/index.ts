// /api/admin (tarea 14): todo exige sesión de OWNER o EDITOR, CSRF en lo que cambia algo
// y un límite por usuario. Nada se guarda en caché.
import { Router } from "express";
import { ADMIN_RATE_LIMIT, type RateLimitConfig } from "../../config.js";
import type { TokenService } from "../../lib/tokens.js";
import { requireAdmin } from "../../middleware/auth.js";
import { createLimiter } from "../../middleware/security.js";
import type { AdminMaskStore } from "../../repositories/admin/masks.js";
import type { PricingRepository } from "../../repositories/admin/pricing.js";
import type { AdminStoryStore } from "../../repositories/admin/stories.js";
import type { AdminVideoStore } from "../../repositories/admin/videos.js";
import { noStoreByDefault } from "../public.js";
import { createAdminMasksRouter } from "./masks.js";
import { createAdminPricingRouter } from "./pricing.js";
import { createAdminStoriesRouter } from "./stories.js";
import { createAdminVideosRouter } from "./videos.js";

export interface AdminDeps {
  tokens: TokenService;
  masks: AdminMaskStore;
  stories: AdminStoryStore;
  videos: AdminVideoStore;
  pricing: PricingRepository;
  rateLimit?: RateLimitConfig;
}

export function createAdminRouter({
  tokens,
  masks,
  stories,
  videos,
  pricing,
  rateLimit = ADMIN_RATE_LIMIT,
}: AdminDeps): Router {
  const router = Router();
  router.use(noStoreByDefault);
  router.use(requireAdmin(tokens, "OWNER", "EDITOR"));
  // Va después de requireAdmin: la llave es el usuario de la sesión, que ya está verificado.
  router.use(
    createLimiter(rateLimit, (_req, res) => {
      const admin = res.locals.admin;
      if (!admin) throw new Error("El límite del admin corrió sin sesión");
      return admin.id;
    }),
  );
  router.use("/masks", createAdminMasksRouter(masks));
  router.use("/stories", createAdminStoriesRouter(stories));
  router.use("/videos", createAdminVideosRouter(videos));
  router.use("/pricing", createAdminPricingRouter(pricing));
  return router;
}
