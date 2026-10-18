import pino, { type Logger, type LevelWithSilent } from "pino";
import type { DestinationStream } from "pino";

// Capa 8: logs JSON sin datos personales ni tokens.
const REDACT_PATHS = [
  "password",
  "*.password",
  "token",
  "*.token",
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
];

export function createLogger(level: LevelWithSilent = "info", destination?: DestinationStream): Logger {
  return pino({ level, redact: { paths: REDACT_PATHS, censor: "[oculto]" } }, destination);
}

interface RawRequest {
  [key: string]: unknown;
  id?: unknown;
  method?: string;
  url?: string;
}

// Solo método y ruta: la query string puede traer correos o teléfonos, y la IP es dato personal.
export function serializeRequest(req: RawRequest) {
  return { id: req.id, method: req.method, path: (req.url ?? "").split("?")[0] };
}

export function serializeResponse(res: { statusCode?: number }) {
  return { statusCode: res.statusCode };
}
