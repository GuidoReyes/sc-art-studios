import { describe, expect, it, vi } from "vitest";
import { adminRequest, login, restoreSession } from "./adminApi";

const SESSION = { user: { id: "u1", role: "OWNER" as const }, csrfToken: "csrf-1" };
const RENEWED = { user: { id: "u1", role: "OWNER" as const }, csrfToken: "csrf-2" };

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** fetch falso que responde en orden y deja ver qué se pidió. */
function respond(...responses: Response[]) {
  const queue = [...responses];
  return vi.fn<typeof fetch>(async () => {
    const next = queue.shift();
    if (!next) throw new Error("fetch no esperado");
    return next;
  });
}

const urlOf = (fetchImpl: ReturnType<typeof respond>, call: number) => String(fetchImpl.mock.calls[call]?.[0]);
const initOf = (fetchImpl: ReturnType<typeof respond>, call: number) => fetchImpl.mock.calls[call]?.[1] ?? {};

describe("login", () => {
  it("envía las credenciales con cookies y devuelve la sesión", async () => {
    const fetchImpl = respond(json(200, { data: SESSION }));

    const result = await login("admin@example.com", "secreto", fetchImpl);

    expect(result).toEqual({ kind: "ok", session: SESSION });
    expect(urlOf(fetchImpl, 0)).toMatch(/\/api\/auth\/login$/);
    expect(initOf(fetchImpl, 0)).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(String(initOf(fetchImpl, 0).body))).toEqual({ email: "admin@example.com", password: "secreto" });
  });

  it.each([
    [401, "invalid"],
    [400, "invalid"],
    [429, "locked"],
    [500, "failed"],
  ])("traduce %i a %s", async (status, kind) => {
    await expect(login("a@b.co", "x", respond(json(status, { error: "x" })))).resolves.toEqual({ kind });
  });

  it("sin red devuelve failed en vez de lanzar", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(login("a@b.co", "x", fetchImpl)).resolves.toEqual({ kind: "failed" });
  });
});

describe("restoreSession", () => {
  it("usa la sesión vigente sin renovar", async () => {
    const fetchImpl = respond(json(200, { data: SESSION }));

    await expect(restoreSession(fetchImpl)).resolves.toEqual({ kind: "ok", session: SESSION });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("con el JWT vencido renueva con el refresh", async () => {
    const fetchImpl = respond(json(401, { error: "Sesión vencida" }), json(200, { data: RENEWED }));

    await expect(restoreSession(fetchImpl)).resolves.toEqual({ kind: "ok", session: RENEWED });
    expect(urlOf(fetchImpl, 1)).toMatch(/\/api\/auth\/refresh$/);
  });

  it("sin refresh válido no hay sesión", async () => {
    const fetchImpl = respond(json(401), json(401));

    await expect(restoreSession(fetchImpl)).resolves.toEqual({ kind: "none" });
  });

  it("dos restauraciones a la vez usan un solo refresh (es de un solo uso)", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (url) =>
      String(url).endsWith("/refresh") ? json(200, { data: RENEWED }) : json(401),
    );

    const results = await Promise.all([restoreSession(fetchImpl), restoreSession(fetchImpl)]);

    expect(results).toEqual([
      { kind: "ok", session: RENEWED },
      { kind: "ok", session: RENEWED },
    ]);
    expect(fetchImpl.mock.calls.filter(([url]) => String(url).endsWith("/refresh"))).toHaveLength(1);
  });

  it("si la API falla no lo confunde con sesión cerrada", async () => {
    await expect(restoreSession(respond(json(503)))).resolves.toEqual({ kind: "failed" });
  });
});

describe("adminRequest", () => {
  it("lee con cookies y sin CSRF (evita el preflight)", async () => {
    const fetchImpl = respond(json(200, { data: { ok: true } }));

    const result = await adminRequest("/api/admin/dashboard", SESSION, {}, fetchImpl);

    expect(result).toEqual({ kind: "ok", data: { data: { ok: true } }, session: SESSION });
    expect(initOf(fetchImpl, 0)).toMatchObject({ method: "GET", credentials: "include" });
    expect(initOf(fetchImpl, 0).headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("en escrituras manda el cuerpo como JSON con el CSRF", async () => {
    const fetchImpl = respond(json(201, { data: { id: "m1" } }));

    await adminRequest("/api/admin/masks", SESSION, { method: "POST", body: { nameEs: "Zorro" } }, fetchImpl);

    expect(initOf(fetchImpl, 0)).toMatchObject({ method: "POST", body: JSON.stringify({ nameEs: "Zorro" }) });
    expect(initOf(fetchImpl, 0).headers).toMatchObject({ "Content-Type": "application/json", "X-CSRF-Token": "csrf-1" });
  });

  it("con el JWT vencido renueva una vez y reintenta con el CSRF nuevo", async () => {
    const fetchImpl = respond(json(401), json(200, { data: RENEWED }), json(201, { data: { id: "m1" } }));

    const result = await adminRequest("/api/admin/masks", SESSION, { method: "POST", body: {} }, fetchImpl);

    expect(result).toEqual({ kind: "ok", data: { data: { id: "m1" } }, session: RENEWED });
    expect(initOf(fetchImpl, 2).headers).toMatchObject({ "X-CSRF-Token": "csrf-2" });
  });

  it("si el refresh también falla, la sesión terminó", async () => {
    const fetchImpl = respond(json(401), json(401));

    await expect(adminRequest("/api/admin/masks", SESSION, {}, fetchImpl)).resolves.toEqual({ kind: "unauthenticated" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("otros errores salen con su código", async () => {
    await expect(adminRequest("/api/admin/masks", SESSION, {}, respond(json(403)))).resolves.toEqual({
      kind: "failed",
      status: 403,
    });
  });
});
