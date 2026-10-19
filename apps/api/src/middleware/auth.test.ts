import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

const SECRET = "s".repeat(32);
vi.mock("../lib/env.js", () => ({ env: { JWT_SECRET: "s".repeat(32) } }));

const { signAccess, requireRole } = await import("./auth.js");

function run(token: string | undefined, roles: ("OWNER" | "EDITOR")[] = ["OWNER"]) {
  const req = { cookies: token ? { access: token } : {} } as unknown as Request & { user?: unknown };
  const res = { statusCode: 200, body: undefined as unknown } as Response & { body: unknown };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; }) as never;
  res.json = vi.fn((body: unknown) => { res.body = body; return res; }) as never;
  const next = vi.fn();
  requireRole(...roles)(req, res, next);
  return { req, res, next };
}

describe("auth (JWT)", () => {
  it("acepta un token válido firmado con HS256", () => {
    const token = signAccess({ sub: "u1", role: "OWNER" });
    expect(jwt.decode(token, { complete: true })?.header.alg).toBe("HS256");
    const { req, next } = run(token);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ sub: "u1", role: "OWNER" });
  });

  it("responde 403 si el rol no está permitido", () => {
    const { res, next } = run(signAccess({ sub: "u1", role: "EDITOR" }), ["OWNER"]);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("responde 401 sin token", () => {
    expect(run(undefined).res.statusCode).toBe(401);
  });

  it("rechaza un token firmado con HS512", () => {
    const token = jwt.sign({ sub: "u1", role: "OWNER" }, SECRET, { algorithm: "HS512" });
    const { res, next } = run(token);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("rechaza un token sin firma (alg none)", () => {
    const token = jwt.sign({ sub: "u1", role: "OWNER" }, null, { algorithm: "none" });
    const { res, next } = run(token);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("rechaza un token con otro secreto", () => {
    const token = jwt.sign({ sub: "u1", role: "OWNER" }, "x".repeat(32), { algorithm: "HS256" });
    expect(run(token).res.statusCode).toBe(401);
  });

  it.each([
    { sub: "u1", role: "ADMIN" },
    { sub: "", role: "OWNER" },
    { role: "OWNER" },
    { sub: 123, role: "OWNER" },
  ])("rechaza un payload mal formado: %o", (payload) => {
    const token = jwt.sign(payload, SECRET, { algorithm: "HS256" });
    const { res, next } = run(token);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
