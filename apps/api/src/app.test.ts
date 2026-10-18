import { describe, it, expect } from "vitest";
import request from "supertest";
import pino from "pino";
import { Writable } from "node:stream";
import { createApp } from "./app.js";

const FRONTEND = "https://scartstudios.com";
const silent = pino({ level: "silent" });
const build = (overrides = {}) => createApp({ allowedOrigins: [FRONTEND], logger: silent, ...overrides });

describe("GET /health", () => {
  it("responde 200 con status ok y timestamp numérico", async () => {
    const res = await request(build()).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("number");
  });
});

describe("cabeceras de seguridad", () => {
  it("envía CSP cerrada, bloquea iframes y oculta x-powered-by", async () => {
    const res = await request(build()).get("/health");

    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("CORS", () => {
  it("permite el dominio propio con credenciales", async () => {
    const res = await request(build()).get("/health").set("Origin", FRONTEND);

    expect(res.headers["access-control-allow-origin"]).toBe(FRONTEND);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("no autoriza un origen ajeno", async () => {
    const res = await request(build()).get("/health").set("Origin", "https://evil.example");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("responde el preflight del dominio propio", async () => {
    const res = await request(build())
      .options("/api/anything")
      .set("Origin", FRONTEND)
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(FRONTEND);
  });

  it("rechaza el preflight de un origen ajeno sin cabeceras CORS", async () => {
    const res = await request(build())
      .options("/api/anything")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "POST");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("rate limiting", () => {
  it("responde 429 al superar el límite general de /api", async () => {
    const app = build({ apiRateLimit: { windowMs: 60_000, limit: 2 } });

    await request(app).get("/api/x");
    await request(app).get("/api/x");
    const res = await request(app).get("/api/x");

    expect(res.status).toBe(429);
    expect(res.body.error).toBeTruthy();
  });

  it("no limita /health aunque /api esté agotado (lo usa el healthcheck de Railway)", async () => {
    const app = build({ apiRateLimit: { windowMs: 60_000, limit: 1 } });

    await request(app).get("/api/x");
    await request(app).get("/api/x");
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });

  it("cuenta por IP del cliente detrás del proxy de Railway (X-Forwarded-For)", async () => {
    const app = build({ apiRateLimit: { windowMs: 60_000, limit: 1 } });

    await request(app).get("/api/x").set("X-Forwarded-For", "203.0.113.1");
    const otherClient = await request(app).get("/api/x").set("X-Forwarded-For", "203.0.113.2");

    expect(otherClient.status).toBe(404);
  });
});

describe("rutas y cuerpos inválidos", () => {
  it("devuelve 404 JSON para rutas desconocidas", async () => {
    const res = await request(build()).get("/no-existe");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "No encontrado" });
  });

  it("devuelve 400 (no 500) con JSON malformado", async () => {
    const res = await request(build())
      .post("/api/x")
      .set("Content-Type", "application/json")
      .send("{malformado");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe("logs de peticiones", () => {
  it("no registran la query string (puede traer correos o teléfonos)", async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });

    await request(build({ logger: pino(stream) })).get("/api/x?email=ana@example.com");

    expect(lines.join("")).toContain('"path":"/api/x"');
    expect(lines.join("")).not.toContain("ana@example.com");
  });
});
