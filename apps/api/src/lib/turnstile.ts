// Capa 5: Cloudflare Turnstile en formularios públicos. Capa 6: timeout y reintentos limitados.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TURNSTILE_MAX_ATTEMPTS, TURNSTILE_TIMEOUT_MS } from "../config.js";

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** true si el token es de una persona; false si Cloudflare lo rechaza. */
export type TurnstileVerifier = (token: string, remoteIp?: string) => Promise<boolean>;

/** Cloudflare no respondió bien: no se sabe si es spam, así que no se guarda nada. */
export class TurnstileUnavailableError extends Error {
  constructor() {
    super("No se pudo verificar Turnstile con Cloudflare");
  }
}

const SiteverifySchema = z.object({ success: z.boolean() });

interface TurnstileOptions {
  secret: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export function createTurnstileVerifier({
  secret,
  fetchFn = fetch,
  timeoutMs = TURNSTILE_TIMEOUT_MS,
}: TurnstileOptions): TurnstileVerifier {
  return async (token, remoteIp) => {
    // La misma llave en el reintento: Cloudflare no cuenta dos veces un token que es de un solo uso.
    const form = new URLSearchParams({ secret, response: token, idempotency_key: randomUUID() });
    if (remoteIp) form.set("remoteip", remoteIp);

    for (let attempt = 1; attempt <= TURNSTILE_MAX_ATTEMPTS; attempt += 1) {
      const result = await requestSiteverify(fetchFn, form, timeoutMs);
      if (result !== undefined) return result;
    }
    throw new TurnstileUnavailableError();
  };
}

// undefined = falla del servicio (red, timeout, 5xx o respuesta inesperada), que vale la pena reintentar.
async function requestSiteverify(
  fetchFn: typeof fetch,
  form: URLSearchParams,
  timeoutMs: number,
): Promise<boolean | undefined> {
  try {
    const response = await fetchFn(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return undefined;
    const parsed = SiteverifySchema.safeParse(await response.json());
    return parsed.success ? parsed.data.success : undefined;
  } catch {
    return undefined;
  }
}
