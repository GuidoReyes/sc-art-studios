import { describe, expect, it, vi } from "vitest";
import { createTokenService } from "../lib/tokens.js";
import { createMemoryAdminRepository, fakeHash, fakeVerify } from "../testing/memoryAdmins.js";
import { createAuthService } from "./auth.js";

const tokens = createTokenService({ accessSecret: "a".repeat(32), refreshSecret: "b".repeat(32) });
const PASSWORD = "una-contraseña-larga";
const OWNER = { id: "u1", email: "duena@example.com", role: "OWNER" as const, passwordHash: fakeHash(PASSWORD), lockedUntil: null };
const MINUTE = 60_000;

function setup(start = new Date("2026-10-20T12:00:00.000Z")) {
  const memory = createMemoryAdminRepository([OWNER]);
  let current = start;
  const clock = {
    now: () => current,
    advance: (ms: number) => (current = new Date(current.getTime() + ms)),
  };
  const service = createAuthService({ repository: memory.repository, tokens, verify: fakeVerify, now: clock.now });
  return { ...memory, service, clock };
}

const actions = (audits: { action: string }[]) => audits.map(({ action }) => action);

describe("login", () => {
  it("con la contraseña correcta emite una sesión, guarda solo el hash del refresh y audita", async () => {
    const { service, sessions, users, audits } = setup();

    const result = await service.login(OWNER.email, PASSWORD, "203.0.113.5");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const { session } = result;
    expect(session.user).toEqual({ id: "u1", email: OWNER.email, role: "OWNER" });
    expect(tokens.verifyAccess(session.accessToken)).toMatchObject({ sub: "u1", role: "OWNER" });
    const sid = tokens.verifyAccess(session.accessToken)?.sid ?? "";
    expect(sid).toMatch(/^[0-9a-f]{32}$/);
    expect(session.csrfToken).toBe(tokens.csrfToken(sid));
    expect(session.refreshExpiresAt).toEqual(new Date("2026-10-27T12:00:00.000Z"));
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.tokenHash).toBe(tokens.hashRefreshToken(session.refreshToken));
    expect(JSON.stringify(sessions)).not.toContain(session.refreshToken);
    expect(users.get("u1")?.lastLoginAt).toEqual(new Date("2026-10-20T12:00:00.000Z"));
    expect(audits).toEqual([{ action: "auth.login", userId: "u1", ip: "203.0.113.5" }]);
  });

  it("con contraseña incorrecta es inválido, suma el fallo y lo audita", async () => {
    const { service, users, audits } = setup();

    expect(await service.login(OWNER.email, "otra", "ip")).toEqual({ status: "invalid" });
    expect(users.get("u1")?.failedLogins).toBe(1);
    expect(actions(audits)).toEqual(["auth.login_failed"]);
  });

  it("con un correo desconocido es inválido y aun así corre la verificación", async () => {
    const memory = createMemoryAdminRepository([OWNER]);
    const verify = vi.fn(async () => false);
    const service = createAuthService({ repository: memory.repository, tokens, verify });

    expect(await service.login("nadie@example.com", PASSWORD)).toEqual({ status: "invalid" });
    expect(verify).toHaveBeenCalledWith(expect.stringMatching(/^\$argon2id\$/), PASSWORD);
    expect(memory.audits).toEqual([]);
  });

  it("al quinto fallo bloquea 15 minutos y ni la contraseña correcta entra mientras dure", async () => {
    const { service, users, audits, clock } = setup();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect((await service.login(OWNER.email, "mal")).status).toBe("invalid");
    }

    expect(await service.login(OWNER.email, "mal")).toEqual({ status: "locked" });
    expect(users.get("u1")?.lockedUntil).toEqual(new Date("2026-10-20T12:15:00.000Z"));
    expect(actions(audits).at(-1)).toBe("auth.locked");

    clock.advance(14 * MINUTE);
    expect(await service.login(OWNER.email, PASSWORD)).toEqual({ status: "locked" });

    clock.advance(MINUTE);
    expect((await service.login(OWNER.email, PASSWORD)).status).toBe("ok");
    expect(users.get("u1")).toMatchObject({ failedLogins: 0, lockedUntil: null });
  });

  it("un acierto reinicia el contador de fallos", async () => {
    const { service, users } = setup();
    await service.login(OWNER.email, "mal");
    await service.login(OWNER.email, "mal");

    await service.login(OWNER.email, PASSWORD);

    expect(users.get("u1")?.failedLogins).toBe(0);
  });
});

describe("refresh", () => {
  async function loggedIn() {
    const context = setup();
    const result = await context.service.login(OWNER.email, PASSWORD);
    if (result.status !== "ok") throw new Error("login falló");
    return { ...context, first: result.session };
  }

  it("rota: marca el token usado y emite otro de la misma familia sin alargar la sesión", async () => {
    const { service, sessions, first, clock } = await loggedIn();
    clock.advance(10 * MINUTE);

    const result = await service.refresh(first.refreshToken);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.session.refreshToken).not.toBe(first.refreshToken);
    expect(result.session.refreshExpiresAt).toEqual(first.refreshExpiresAt);
    expect(result.session.csrfToken).toBe(first.csrfToken);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.usedAt).toEqual(clock.now());
    expect(sessions[1]?.familyId).toBe(sessions[0]?.familyId);
  });

  it("reusar un token ya rotado revoca toda la familia y lo audita", async () => {
    const { service, sessions, audits, first } = await loggedIn();
    const second = await service.refresh(first.refreshToken);
    if (second.status !== "ok") throw new Error("refresh falló");

    expect(await service.refresh(first.refreshToken)).toEqual({ status: "invalid" });

    expect(sessions.every(({ revokedAt }) => revokedAt !== null)).toBe(true);
    expect(actions(audits).at(-1)).toBe("auth.refresh_reuse");
    // El token bueno también queda inservible: quien lo robó y la dueña vuelven a entrar con contraseña.
    expect(await service.refresh(second.session.refreshToken)).toEqual({ status: "invalid" });
  });

  it("si otro pedido gana la rotación, revoca la familia", async () => {
    const { repository, service, first } = await loggedIn();
    vi.spyOn(repository, "rotateSession").mockResolvedValueOnce(false);
    const revokeFamily = vi.spyOn(repository, "revokeFamily");

    expect(await service.refresh(first.refreshToken)).toEqual({ status: "invalid" });
    expect(revokeFamily).toHaveBeenCalled();
  });

  it("es inválido con un token desconocido o vencido", async () => {
    const { service, first, clock } = await loggedIn();
    expect(await service.refresh("desconocido")).toEqual({ status: "invalid" });

    clock.advance(7 * 24 * 60 * MINUTE);
    expect(await service.refresh(first.refreshToken)).toEqual({ status: "invalid" });
  });
});

describe("logout", () => {
  it("revoca la familia y lo audita", async () => {
    const { service, sessions, audits } = setup();
    const result = await service.login(OWNER.email, PASSWORD);
    if (result.status !== "ok") throw new Error("login falló");

    await service.logout(result.session.refreshToken, "ip");

    expect(sessions[0]?.revokedAt).not.toBeNull();
    expect(audits.at(-1)).toEqual({ action: "auth.logout", userId: "u1", ip: "ip" });
    expect(await service.refresh(result.session.refreshToken)).toEqual({ status: "invalid" });
  });

  it("sin token o con uno desconocido no hace nada", async () => {
    const { service, audits } = setup();

    await service.logout(undefined);
    await service.logout("desconocido");

    expect(audits).toEqual([]);
  });
});
