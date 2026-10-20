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

// Cotizador con peso y medidas a mano: topes de un bulto de courier (FedEx: 68 kg y 274 cm por lado).
// Validan la entrada; las tarifas de cada tramo viven en la DB.
export const QUOTE_MAX_WEIGHT_GRAMS = 68_000;
export const QUOTE_MAX_SIDE_CM = 274;

// Rutas públicas: la CDN guarda 5 min y el navegador 1 min (el admin revalida al publicar).
export const PUBLIC_CACHE_CONTROL = "public, max-age=60, s-maxage=300";
// Paginación de las listas públicas (máscaras, historias, videos).
export const PUBLIC_PAGE_SIZE = 24;
export const PUBLIC_MAX_PAGE_SIZE = 48;
// Tope para que `page` no dispare un OFFSET enorme en MySQL.
export const PUBLIC_MAX_PAGE = 1000;

// Turnstile (capa 6): si Cloudflare tarda o falla, un solo reintento y luego 503.
export const TURNSTILE_TIMEOUT_MS = 5_000;
export const TURNSTILE_MAX_ATTEMPTS = 2;

// Foto de referencia de un encargo (capa 3): tope de subida y cómo se re-codifica.
export const REFERENCE_MAX_BYTES = 8 * 1024 * 1024;
export const REFERENCE_MAX_DIMENSION = 2048;
// 40 MP: más que cualquier cámara de teléfono, muy por debajo del default de sharp (268 MP).
export const REFERENCE_MAX_INPUT_PIXELS = 40_000_000;
export const REFERENCE_WEBP_QUALITY = 85;
// R2 (capa 6): una foto de 2048 px pesa < 1 MB; 10 s y un reintento alcanzan.
export const R2_REQUEST_TIMEOUT_MS = 10_000;
export const R2_MAX_ATTEMPTS = 2;

export const JSON_BODY_LIMIT = "1mb";
export const SHUTDOWN_TIMEOUT_MS = 10_000;

// Pool de MySQL: una sola instancia de API en Railway, tráfico bajo.
export const DB_CONNECTION_LIMIT = 5;
export const DB_CONNECT_TIMEOUT_MS = 5_000;
