import { z } from "zod";

// CORS compara el origen exacto: `https://a.com/` o con ruta no coincidiría nunca.
const Origin = z
  .url({ protocol: /^https?$/ })
  .transform((value) => new URL(value).origin);

const REQUIRED_IN_PRODUCTION = [
  "TURNSTILE_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PRIVATE_BUCKET",
] as const;

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FRONTEND_URL: Origin,
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),
  // Formulario de encargos: anti-spam y bucket privado para las fotos de referencia de los clientes.
  TURNSTILE_SECRET: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().regex(/^[0-9a-f]{32}$/, "id de cuenta de Cloudflare (32 hex)").optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_PRIVATE_BUCKET: z.string().min(3).max(63).optional(),
}).superRefine((env, ctx) => {
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    ctx.addIssue({ code: "custom", path: ["JWT_REFRESH_SECRET"], message: "debe ser distinto de JWT_SECRET" });
  }
  // En desarrollo pueden faltar (el formulario no se monta o no acepta fotos); en producción no.
  if (env.NODE_ENV !== "production") return;
  for (const name of REQUIRED_IN_PRODUCTION) {
    if (!env[name]) ctx.addIssue({ code: "custom", path: [name], message: "obligatoria en producción" });
  }
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
