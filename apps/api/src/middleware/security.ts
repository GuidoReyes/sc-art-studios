import type { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "../lib/env.js";

// Capas 4 y 5: cabeceras, CORS cerrado y límites de abuso.
export function applySecurity(app: Express) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Railway está detrás de un proxy
  app.use(helmet());
  app.use(
    cors({
      origin: [env.FRONTEND_URL],
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));
}

export const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false });
export const formLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });
