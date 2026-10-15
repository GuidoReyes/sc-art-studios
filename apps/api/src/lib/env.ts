import { z } from "zod";

// Falla al arrancar si falta una variable: mejor que fallar en producción a mitad de una venta.
const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url(),
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export const env = Env.parse(process.env);
