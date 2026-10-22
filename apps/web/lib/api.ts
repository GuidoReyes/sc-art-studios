// Lecturas de la API pública (Express) desde el servidor de Next. API_URL no lleva NEXT_PUBLIC_:
// nunca llega al navegador. Las respuestas se guardan 60 s (ISR), igual que la caché de la API.
const DEFAULT_API_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 5_000;
export const REVALIDATE_SECONDS = 60;

const API_URL = (process.env.API_URL || DEFAULT_API_URL).replace(/\/$/, "");

export type Query = Record<string, string | number | undefined>;

export class ApiError extends Error {
  constructor(readonly status: number, path: string) {
    super(`La API respondió ${status} en ${path}`);
    this.name = "ApiError";
  }
}

/** URL de la API con los parámetros definidos (los undefined se omiten). */
export function apiUrl(path: string, query: Query = {}): string {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** GET a la API; null si responde 404. Cualquier otro error se lanza para que lo maneje la página. */
export async function apiGet<T>(path: string, query?: Query): Promise<T | null> {
  const res = await fetch(apiUrl(path, query), {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, path);
  return (await res.json()) as T;
}

/**
 * Para secciones que pueden faltar sin romper la página (el inicio): si la API falla, se usa el respaldo
 * y queda constancia en el log del servidor, sin datos del visitante.
 */
export async function orFallback<T>(promise: Promise<T>, fallback: T, context: string): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error(`[${context}] API no disponible:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}
