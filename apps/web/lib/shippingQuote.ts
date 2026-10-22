// Cotización de envío desde el navegador: POST /api/shipping/quote de la API (con su propio límite por IP).
import type { ShippingQuoteDto, ShippingQuoteResponse } from "@sc-art-studio/shared";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 8_000;

/** Países del selector: primero a los que ya se envía (zonas de FedEx en la DB), luego los más pedidos. */
export const ESTIMATOR_COUNTRIES = ["US", "CA", "MX", "ES", "DE", "AU", "GB", "FR", "IT", "NL", "JP", "GT"] as const;

export type QuoteResult =
  | { kind: "quote"; quote: ShippingQuoteDto }
  /** La máscara aún no tiene peso o caja cargados en el admin. */
  | { kind: "incomplete" }
  | { kind: "rateLimited" }
  | { kind: "failed" };

export async function requestShippingQuote(maskId: string, country: string, fetchImpl: typeof fetch = fetch): Promise<QuoteResult> {
  try {
    const res = await fetchImpl(`${API_URL}/api/shipping/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ maskId, country }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 422) return { kind: "incomplete" };
    if (res.status === 429) return { kind: "rateLimited" };
    if (!res.ok) return { kind: "failed" };
    const { data } = (await res.json()) as ShippingQuoteResponse;
    return { kind: "quote", quote: data };
  } catch {
    // Sin red, timeout o CORS: el visitante ve un mensaje para reintentar, no un error técnico.
    return { kind: "failed" };
  }
}
