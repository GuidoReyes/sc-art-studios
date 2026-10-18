// Límites técnicos de la API (no son datos de negocio: los precios viven en la DB).
const MINUTE_MS = 60_000;

export interface RateLimitConfig {
  windowMs: number;
  limit: number;
}

// General para /api. Holgado porque el SSR de Vercel llama desde pocas IPs compartidas.
export const API_RATE_LIMIT: RateLimitConfig = { windowMs: MINUTE_MS, limit: 120 };
// Estrictos (capa 5): login, formularios públicos y cotizador de envío.
export const LOGIN_RATE_LIMIT: RateLimitConfig = { windowMs: 15 * MINUTE_MS, limit: 5 };
export const FORM_RATE_LIMIT: RateLimitConfig = { windowMs: 60 * MINUTE_MS, limit: 10 };
export const QUOTE_RATE_LIMIT: RateLimitConfig = { windowMs: MINUTE_MS, limit: 20 };

export const JSON_BODY_LIMIT = "1mb";
export const SHUTDOWN_TIMEOUT_MS = 10_000;
