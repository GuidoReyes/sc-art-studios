import { afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { createTokenService } from "./tokens.js";

const ACCESS = "a".repeat(32);
const REFRESH = "b".repeat(32);
const tokens = createTokenService({ accessSecret: ACCESS, refreshSecret: REFRESH });
const CLAIMS = { sub: "u1", role: "OWNER", sid: "fam1" } as const;

afterEach(() => vi.useRealTimers());

describe("JWT de acceso", () => {
  it("firma con HS256 y lo verifica de vuelta con sus claims", () => {
    const token = tokens.signAccess(CLAIMS);

    expect(jwt.decode(token, { complete: true })?.header.alg).toBe("HS256");
    expect(tokens.verifyAccess(token)).toEqual(CLAIMS);
  });

  it("vence a los 15 minutos", () => {
    vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00Z") });
    const token = tokens.signAccess(CLAIMS);

    vi.setSystemTime(new Date("2026-10-20T12:14:59Z"));
    expect(tokens.verifyAccess(token)).not.toBeNull();
    vi.setSystemTime(new Date("2026-10-20T12:15:01Z"));
    expect(tokens.verifyAccess(token)).toBeNull();
  });

  it("rechaza un token firmado con HS512", () => {
    expect(tokens.verifyAccess(jwt.sign(CLAIMS, ACCESS, { algorithm: "HS512" }))).toBeNull();
  });

  it("rechaza un token sin firma (alg none)", () => {
    expect(tokens.verifyAccess(jwt.sign(CLAIMS, null, { algorithm: "none" }))).toBeNull();
  });

  it("rechaza un token con otro secreto, incluido el del refresh", () => {
    expect(tokens.verifyAccess(jwt.sign(CLAIMS, REFRESH, { algorithm: "HS256" }))).toBeNull();
  });

  it("rechaza texto que no es un JWT", () => {
    expect(tokens.verifyAccess("no-es-un-jwt")).toBeNull();
  });

  it.each([
    { sub: "u1", role: "ADMIN", sid: "f" },
    { sub: "", role: "OWNER", sid: "f" },
    { role: "OWNER", sid: "f" },
    { sub: 123, role: "OWNER", sid: "f" },
    { sub: "u1", role: "OWNER" },
  ])("rechaza un payload mal formado: %o", (payload) => {
    expect(tokens.verifyAccess(jwt.sign(payload, ACCESS, { algorithm: "HS256" }))).toBeNull();
  });
});

describe("refresh", () => {
  it("genera tokens aleatorios de 256 bits en base64url", () => {
    const [first, second] = [tokens.newRefreshToken(), tokens.newRefreshToken()];

    expect(first).toMatch(/^[\w-]{43}$/);
    expect(first).not.toBe(second);
  });

  it("guarda un HMAC hex de 64 caracteres que depende del secreto", () => {
    const other = createTokenService({ accessSecret: ACCESS, refreshSecret: "c".repeat(32) });

    expect(tokens.hashRefreshToken("t")).toMatch(/^[0-9a-f]{64}$/);
    expect(tokens.hashRefreshToken("t")).toBe(tokens.hashRefreshToken("t"));
    expect(other.hashRefreshToken("t")).not.toBe(tokens.hashRefreshToken("t"));
  });
});

describe("CSRF", () => {
  it("acepta el token de su sesión", () => {
    expect(tokens.isValidCsrf("fam1", tokens.csrfToken("fam1"))).toBe(true);
  });

  it.each([
    ["el de otra sesión", tokens.csrfToken("fam2")],
    ["uno vacío", ""],
    ["uno de otro largo", "abc"],
    ["un valor que no es texto", ["x"]],
    ["ninguno", undefined],
  ])("rechaza %s", (_name, candidate) => {
    expect(tokens.isValidCsrf("fam1", candidate)).toBe(false);
  });
});
