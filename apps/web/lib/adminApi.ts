// Cliente del admin en el navegador (tarea 33). La sesión vive en cookies httpOnly que pone la API
// (JavaScript nunca las ve); aquí solo se guarda en memoria el token CSRF que devuelve /api/auth.
import type { AdminSessionDto, AdminSessionResponse } from "@sc-art-studio/shared";
import { BROWSER_API_URL } from "./site";

const REQUEST_TIMEOUT_MS = 10_000;
const CSRF_HEADER = "X-CSRF-Token";

export type LoginResult = { kind: "ok"; session: AdminSessionDto } | { kind: "invalid" | "locked" | "failed" };
export type SessionResult = { kind: "ok"; session: AdminSessionDto } | { kind: "none" | "failed" };
export type AdminResult<T> =
  | { kind: "ok"; data: T; session: AdminSessionDto }
  | { kind: "unauthenticated" }
  | { kind: "failed"; status: number | null };

export interface AdminRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

type Fetch = typeof fetch;

/** fetch a la API con las cookies de sesión; null si no hubo respuesta (red, timeout o CORS). */
async function call(fetchImpl: Fetch, path: string, init: RequestInit = {}): Promise<Response | null> {
  try {
    return await fetchImpl(`${BROWSER_API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { Accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

async function readSession(res: Response): Promise<AdminSessionDto> {
  return ((await res.json()) as AdminSessionResponse).data;
}

const jsonInit = (method: string, body: unknown, csrfToken?: string): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json", ...(csrfToken ? { [CSRF_HEADER]: csrfToken } : {}) },
  body: JSON.stringify(body),
});

export async function login(email: string, password: string, fetchImpl: Fetch = fetch): Promise<LoginResult> {
  const res = await call(fetchImpl, "/api/auth/login", jsonInit("POST", { email, password }));
  if (res?.ok) return { kind: "ok", session: await readSession(res) };
  if (res?.status === 401 || res?.status === 400) return { kind: "invalid" };
  if (res?.status === 429) return { kind: "locked" };
  return { kind: "failed" };
}

// El refresh es de un solo uso: si llega dos veces, la API lo toma por robado y cierra la sesión.
// Por eso los pedidos que vencen a la vez (o el doble efecto de React en desarrollo) comparten uno.
let pendingRefresh: Promise<SessionResult> | null = null;

/** Pide un JWT nuevo con la cookie de refresh (rotativa). */
function refresh(fetchImpl: Fetch): Promise<SessionResult> {
  pendingRefresh ??= (async (): Promise<SessionResult> => {
    const res = await call(fetchImpl, "/api/auth/refresh", { method: "POST" });
    if (res?.ok) return { kind: "ok", session: await readSession(res) };
    return res?.status === 401 ? { kind: "none" } : { kind: "failed" };
  })().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

/** Recupera la sesión al cargar una página del admin: primero con el JWT y, si venció, con el refresh. */
export async function restoreSession(fetchImpl: Fetch = fetch): Promise<SessionResult> {
  const res = await call(fetchImpl, "/api/auth/session");
  if (res?.ok) return { kind: "ok", session: await readSession(res) };
  if (res?.status === 401) return refresh(fetchImpl);
  return { kind: "failed" };
}

export async function logout(fetchImpl: Fetch = fetch): Promise<void> {
  await call(fetchImpl, "/api/auth/logout", { method: "POST" });
}

/**
 * Pedido a /api/admin con el CSRF de la sesión. Si el JWT de 15 min venció, renueva una vez y
 * reintenta; la sesión devuelta trae el CSRF nuevo para guardarlo.
 */
export async function adminRequest<T>(
  path: string,
  session: AdminSessionDto,
  { method = "GET", body }: AdminRequest = {},
  fetchImpl: Fetch = fetch,
): Promise<AdminResult<T>> {
  // GET no lleva CSRF (la API no lo pide en lecturas), así no hay preflight de CORS.
  const send = (current: AdminSessionDto) =>
    call(fetchImpl, path, method === "GET" ? { method } : jsonInit(method, body, current.csrfToken));

  let current = session;
  let res = await send(current);
  if (res?.status === 401) {
    const renewed = await refresh(fetchImpl);
    if (renewed.kind !== "ok") return renewed.kind === "none" ? { kind: "unauthenticated" } : { kind: "failed", status: null };
    current = renewed.session;
    res = await send(current);
  }
  if (res?.status === 401) return { kind: "unauthenticated" };
  if (!res?.ok) return { kind: "failed", status: res?.status ?? null };
  const data = res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  return { kind: "ok", data, session: current };
}
