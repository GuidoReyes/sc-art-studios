import type { Express, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { API_RATE_LIMIT, FORM_RATE_LIMIT, LOGIN_RATE_LIMIT, QUOTE_RATE_LIMIT, type RateLimitConfig } from "../config.js";

export interface SecurityOptions {
  allowedOrigins: readonly string[];
  apiRateLimit?: RateLimitConfig;
}

export function createLimiter({ windowMs, limit, skipSuccessfulRequests = false }: RateLimitConfig) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ error: "Demasiadas solicitudes, intenta más tarde" });
    },
  });
}

// Capas 4 y 5: cabeceras, CORS cerrado y límites de abuso.
export function applySecurity(app: Express, { allowedOrigins, apiRateLimit = API_RATE_LIMIT }: SecurityOptions) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Railway está detrás de un proxy
  app.use(
    helmet({
      // La API solo devuelve JSON: nada que cargar ni incrustar.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
      },
      frameguard: { action: "deny" },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.use(cors({ origin: [...allowedOrigins], credentials: true }));
  app.use(cookieParser());
  app.use("/api", createLimiter(apiRateLimit));
}

export const loginLimiter = createLimiter(LOGIN_RATE_LIMIT);
export const formLimiter = createLimiter(FORM_RATE_LIMIT);
export const quoteLimiter = createLimiter(QUOTE_RATE_LIMIT);
