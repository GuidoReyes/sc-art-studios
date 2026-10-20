import express from "express";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { randomUUID } from "node:crypto";
import { JSON_BODY_LIMIT, type RateLimitConfig } from "./config.js";
import { serializeRequest, serializeResponse } from "./lib/logger.js";
import { applySecurity } from "./middleware/security.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import type { MaskRepository } from "./repositories/masks.js";
import { createMasksRouter } from "./routes/masks.js";

export interface AppOptions {
  allowedOrigins: readonly string[];
  logger: Logger;
  apiRateLimit?: RateLimitConfig;
  /** Sin repositorio no se montan las rutas del catálogo (pruebas de cabeceras, CORS, etc.). */
  masks?: MaskRepository;
}

export function createApp({ allowedOrigins, logger, apiRateLimit, masks }: AppOptions) {
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
  // app.use("/api/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
