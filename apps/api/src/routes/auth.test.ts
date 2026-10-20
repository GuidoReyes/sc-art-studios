import { describe, expect, it } from "vitest";
import request, { type Response } from "supertest";
import pino from "pino";
import { createApp } from "../app.js";
import { createTokenService } from "../lib/tokens.js";
import { ACCESS_COOKIE } from "../middleware/auth.js";
import { createAuthService } from "../services/auth.js";
import { createMemoryAdminRepository, fakeHash, fakeVerify } from "../testing/memoryAdmins.js";
import { type AuthDeps, REFRESH_COOKIE } from "./auth.js";

const silent = pino({ level: "silent" });
const tokens = createTokenService({ accessSecret: "a".repeat(32), refreshSecret: "b".repeat(32) });
const PASSWORD = "una-contraseña-larga";
const OWNER = { id: "u1", email: "duena@example.com", role: "OWNER" as const, passwordHash: fakeHash(PASSWORD), lockedUntil: null };

function setup(extra: Partial<AuthDeps> = {}) {
  const memory = createMemoryAdminRepository([OWNER]);
  const service = createAuthService({ repository: memory.repository, tokens, verify: fakeVerify });
  const app = createApp({ allowedOrigins: ["https://scartstudios.com"], logger: silent, auth: { service, tokens, ...extra } });
  return { ...memory, app };
}

/** Las cookies Secure no viajan por http en supertest: se reenvían a mano. */
function cookiesOf(res: Response): Record<string, string> {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  return Object.fromEntries(
    (raw ?? []).map((line) => {
      const [pair = ""] = line.split(";");
      const index = pair.indexOf("=");
      return [pair.slice(0, index), pair.slice(index + 1)];
    }),
  );
}

const setCookie = (res: Response, name: string) =>
  ((res.headers["set-cookie"] as unknown as string[] | undefined) ?? []).find((line) => line.startsWith(`${name}=`)) ?? "";

const login = (app: ReturnType<typeof setup>["app"], body: object = { email: OWNER.email, password: PASSWORD }) =>
  request(app).post("/api/auth/login").send(body);

describe("POST /api/auth/login", () => {
  it("devuelve el CSRF y pone las dos cookies httpOnly, Secure y con SameSite", async () => {
    const { app } = setup();

    const res = await login(app, { email: "  DUENA@example.com ", password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toEqual({ data: { user: { id: "u1", role: "OWNER" }, csrfToken: expect.any(String) } });
    const access = setCookie(res, ACCESS_COOKIE);
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/Secure/);
    expect(access).toMatch(/SameSite=Lax/);
    expect(access).toMatch(/Path=\/(;|$)/);
    expect(access).toMatch(/Max-Age=900/);
    const refresh = setCookie(res, REFRESH_COOKIE);
    expect(refresh).toMatch(/HttpOnly/);
    expect(refresh).toMatch(/Secure/);
    expect(refresh).toMatch(/SameSite=Strict/);
    expect(refresh).toMatch(/Path=\/api\/auth/);
    // Los tokens no salen en el cuerpo: solo en cookies que JavaScript no puede leer.
    expect(JSON.stringify(res.body)).not.toContain(cookiesOf(res)[REFRESH_COOKIE]);
  });

  it("401 con la misma respuesta para contraseña incorrecta y correo desconocido", async () => {
    const { app } = setup();

    const wrong = await login(app, { email: OWNER.email, password: "otra" });
    const unknown = await login(app, { email: "nadie@example.com", password: "otra" });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(setCookie(wrong, ACCESS_COOKIE)).toBe("");
  });

  it("al quinto fallo bloquea la cuenta (429) aunque vengan de IPs distintas", async () => {
    // Límite por IP alto para ver solo el bloqueo por cuenta.
    const { app, audits } = setup({ loginRateLimit: { windowMs: 60_000, limit: 100, skipSuccessfulRequests: true } });
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect((await login(app, { email: OWNER.email, password: "mal" })).status).toBe(401);
    }

    expect((await login(app, { email: OWNER.email, password: "mal" })).status).toBe(429);
    const correct = await login(app);
    expect(correct.status).toBe(429);
    expect(correct.body.error).toMatch(/15 minutos/);
    expect(audits.map(({ action }) => action)).toContain("auth.locked");
  });

  it("el límite por IP corta al pasarse de fallos y no cuenta los aciertos", async () => {
    const { app } = setup({ loginRateLimit: { windowMs: 60_000, limit: 2, skipSuccessfulRequests: true } });

    expect((await login(app)).status).toBe(200);
    expect((await login(app, { email: "x@example.com", password: "mal" })).status).toBe(401);
    expect((await login(app, { email: "x@example.com", password: "mal" })).status).toBe(401);
    expect((await login(app, { email: "x@example.com", password: "mal" })).status).toBe(429);
  });

  it.each([
    ["sin contraseña", { email: OWNER.email }],
    ["correo inválido", { email: "no-es-correo", password: PASSWORD }],
    ["contraseña gigante", { email: OWNER.email, password: "x".repeat(257) }],
    ["campo desconocido", { email: OWNER.email, password: PASSWORD, role: "OWNER" }],
  ])("400 con %s", async (_name, body) => {
    expect((await login(setup().app, body)).status).toBe(400);
  });
});

describe("sesión, refresh y logout", () => {
  it("con la cookie se usa una ruta protegida; refresh rota; reusar el viejo cierra todo", async () => {
    const { app, sessions } = setup();
    const loginRes = await login(app);
    const { csrfToken } = loginRes.body.data;
    const first = cookiesOf(loginRes);

    const session = await request(app).get("/api/auth/session").set("Cookie", `${ACCESS_COOKIE}=${first[ACCESS_COOKIE]}`);
    expect(session.status).toBe(200);
    expect(session.body).toEqual({ data: { user: { id: "u1", role: "OWNER" }, csrfToken } });
    expect((await request(app).get("/api/auth/session")).status).toBe(401);

    const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", `${REFRESH_COOKIE}=${first[REFRESH_COOKIE]}`);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.csrfToken).toBe(csrfToken);
    expect(cookiesOf(refreshed)[REFRESH_COOKIE]).not.toBe(first[REFRESH_COOKIE]);

    const reuse = await request(app).post("/api/auth/refresh").set("Cookie", `${REFRESH_COOKIE}=${first[REFRESH_COOKIE]}`);
    expect(reuse.status).toBe(401);
    expect(setCookie(reuse, REFRESH_COOKIE)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(sessions.every(({ revokedAt }) => revokedAt !== null)).toBe(true);
  });

  it("refresh sin cookie es 401", async () => {
    expect((await request(setup().app).post("/api/auth/refresh")).status).toBe(401);
  });

  it("logout revoca la sesión y borra las dos cookies con su misma ruta", async () => {
    const { app, sessions, audits } = setup();
    const refresh = cookiesOf(await login(app))[REFRESH_COOKIE];

    const res = await request(app).post("/api/auth/logout").set("Cookie", `${REFRESH_COOKIE}=${refresh}`);

    expect(res.status).toBe(204);
    expect(setCookie(res, ACCESS_COOKIE)).toMatch(/Path=\/;.*Expires=Thu, 01 Jan 1970/);
    expect(setCookie(res, REFRESH_COOKIE)).toMatch(/Path=\/api\/auth/);
    expect(sessions[0]?.revokedAt).not.toBeNull();
    expect(audits.at(-1)?.action).toBe("auth.logout");
    expect((await request(app).post("/api/auth/refresh").set("Cookie", `${REFRESH_COOKIE}=${refresh}`)).status).toBe(401);
  });

  it("logout sin sesión también responde 204", async () => {
    expect((await request(setup().app).post("/api/auth/logout")).status).toBe(204);
  });
});
