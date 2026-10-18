import { z } from "zod";

// CORS compara el origen exacto: `https://a.com/` o con ruta no coincidiría nunca.
const Origin = z
  .url({ protocol: /^https?$/ })
  .transform((value) => new URL(value).origin);

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FRONTEND_URL: Origin,
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),
}).refine((env) => env.JWT_SECRET !== env.JWT_REFRESH_SECRET, {
  path: ["JWT_REFRESH_SECRET"],
  message: "debe ser distinto de JWT_SECRET",
});

export type Env = z.infer<typeof EnvSchema>;

// Falla al arrancar si falta una variable: mejor que fallar en producción a mitad de una venta.
// El mensaje solo nombra las variables, nunca sus valores (pueden ser secretos).
export function parseEnv(source: Record<string, string | undefined>): Env {
  // `VAR=` vacío en .env o en Railway cuenta como "no definida".
  const defined = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ""));
  const result = EnvSchema.safeParse(defined);
  if (result.success) return result.data;
  const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
  throw new Error(`Variables de entorno faltantes o inválidas: ${names.join(", ")}`);
}
