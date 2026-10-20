import express from "express";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { randomUUID } from "node:crypto";
import { JSON_BODY_LIMIT, type RateLimitConfig } from "./config.js";
import { serializeRequest, serializeResponse } from "./lib/logger.js";
import { applySecurity } from "./middleware/security.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import type { MaskRepository } from "./repositories/masks.js";
import type { StoryRepository } from "./repositories/stories.js";
import type { VideoRepository } from "./repositories/videos.js";
import { type CustomRequestsDeps, createCustomRequestsRouter } from "./routes/customRequests.js";
import { createMasksRouter } from "./routes/masks.js";
import { type ShippingDeps, createShippingRouter } from "./routes/shipping.js";
import { createStoriesRouter } from "./routes/stories.js";
import { createVideosRouter } from "./routes/videos.js";

export interface AppOptions {
  allowedOrigins: readonly string[];
  logger: Logger;
  apiRateLimit?: RateLimitConfig;
  // Sin repositorio no se monta su ruta (pruebas de cabeceras, CORS, etc.).
  masks?: MaskRepository;
  stories?: StoryRepository;
  videos?: VideoRepository;
  /** Sin Turnstile no hay formulario de encargos: se monta solo con sus dependencias. */
  customRequests?: CustomRequestsDeps;
  shipping?: ShippingDeps;
}

export function createApp({
  allowedOrigins,
  logger,
  apiRateLimit,
  masks,
  stories,
  videos,
  customRequests,
  shipping,
}: AppOptions) {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      genReqId: () => randomUUID(),
      serializers: { req: serializeRequest, res: serializeResponse },
      autoLogging: { ignore: (req) => req.url === "/health" },
    }),
  );
  applySecurity(app, { allowedOrigins, apiRateLimit });

  // Los webhooks necesitan el body crudo para verificar HMAC: registrar sus rutas ANTES de express.json().
  // app.post("/webhooks/shopify", express.raw({ type: "application/json" }), shopifyWebhook);

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });
  if (masks) app.use("/api/masks", createMasksRouter(masks));
  if (stories) app.use("/api/stories", createStoriesRouter(stories));
  if (videos) app.use("/api/videos", createVideosRouter(videos));
  if (customRequests) app.use("/api/custom-requests", createCustomRequestsRouter(customRequests));
  if (shipping) app.use("/api/shipping", createShippingRouter(shipping));
  // app.use("/api/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
