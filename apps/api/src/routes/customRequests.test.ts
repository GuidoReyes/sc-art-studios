import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import pino from "pino";
import sharp from "sharp";
import { createApp } from "../app.js";
import { TurnstileUnavailableError } from "../lib/turnstile.js";
import type { ReferenceStorage } from "../lib/storage.js";
import type { CustomRequestRepository } from "../repositories/customRequests.js";
import type { CustomRequestsDeps } from "./customRequests.js";

const silent = pino({ level: "silent" });
const NOW = new Date("2026-10-19T12:00:00.000Z");

const FORM = {
  name: "  Emily Ejemplo  ",
  email: "emily@example.com",
  country: "us",
  idea: "Una máscara de quetzal con plumas verdes para colgar en la sala",
  colors: "verde y dorado",
  size: "",
  desiredDate: "2026-12-01",
  turnstileToken: "token-de-prueba",
};

function deps(overrides: Partial<CustomRequestsDeps> = {}) {
  const repository: CustomRequestRepository = { create: vi.fn(async () => ({ id: "cr_1" })) };
  const storage: ReferenceStorage = { put: vi.fn(async () => {}), remove: vi.fn(async () => {}) };
  const verifyTurnstile = vi.fn(async () => true);
  return { repository, storage, verifyTurnstile, now: () => NOW, ...overrides };
}

const build = (customRequests: CustomRequestsDeps) =>
  createApp({ allowedOrigins: ["https://scartstudios.com"], logger: silent, customRequests });

function post(app: ReturnType<typeof build>, fields: Record<string, string> = FORM) {
  const req = request(app).post("/api/custom-requests");
  for (const [key, value] of Object.entries(fields)) req.field(key, value);
  return req;
}

const jpegWithExif = () =>
  sharp({ create: { width: 32, height: 32, channels: 3, background: "#0a0" } })
    .jpeg()
    .withExif({ IFD0: { Artist: "Nombre del cliente" } })
    .toBuffer();

describe("POST /api/custom-requests", () => {
  it("guarda el encargo como NEW con los datos normalizados y responde 201", async () => {
    const d = deps();

    const res = await post(build(d));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "cr_1" });
    expect(d.verifyTurnstile).toHaveBeenCalledWith("token-de-prueba", expect.any(String));
    expect(d.repository.create).toHaveBeenCalledWith({
      name: "Emily Ejemplo",
      email: "emily@example.com",
      country: "US",
      idea: FORM.idea,
      colors: "verde y dorado",
      desiredDate: new Date("2026-12-01T00:00:00.000Z"),
    });
    expect(d.storage.put).not.toHaveBeenCalled();
  });

  it("también acepta JSON cuando no hay foto", async () => {
    const d = deps();

    const res = await request(build(d)).post("/api/custom-requests").send({ ...FORM, size: undefined });

    expect(res.status).toBe(201);
  });

  it("re-codifica la foto, la sube al bucket privado y guarda su llave", async () => {
    const d = deps();

    const res = await post(build(d)).attach("reference", await jpegWithExif(), "quetzal.jpg");

    expect(res.status).toBe(201);
    const [key, data, contentType] = vi.mocked(d.storage.put).mock.calls[0] ?? [];
    expect(key).toMatch(/^custom-requests\/[0-9a-f-]{36}\.webp$/);
    expect(contentType).toBe("image/webp");
    expect((await sharp(data).metadata()).exif).toBeUndefined();
    expect(d.repository.create).toHaveBeenCalledWith(expect.objectContaining({ referenceR2Key: key }));
  });

  it.each([
    ["sin nombre", { name: "" }],
    ["correo inválido", { email: "no-es-correo" }],
    ["país que no existe", { country: "ZZ" }],
    ["país con más de dos letras", { country: "USA" }],
    ["idea demasiado corta", { idea: "hola" }],
    ["fecha deseada en el pasado", { desiredDate: "2026-10-01" }],
    ["fecha deseada a más de dos años", { desiredDate: "2029-01-01" }],
    ["fecha que no existe", { desiredDate: "2026-02-30" }],
    ["sin token de Turnstile", { turnstileToken: "" }],
    ["un campo desconocido", { isAdmin: "true" }],
  ])("responde 400 con %s sin llamar a Turnstile", async (_case, change) => {
    const d = deps();

    const res = await post(build(d), { ...FORM, ...change });

    expect(res.status).toBe(400);
    expect(d.verifyTurnstile).not.toHaveBeenCalled();
    expect(d.repository.create).not.toHaveBeenCalled();
  });

  it("responde 403 si Turnstile rechaza el token y no guarda nada", async () => {
    const d = deps({ verifyTurnstile: vi.fn(async () => false) });

    const res = await post(build(d)).attach("reference", await jpegWithExif(), "quetzal.jpg");

    expect(res.status).toBe(403);
    expect(d.storage.put).not.toHaveBeenCalled();
    expect(d.repository.create).not.toHaveBeenCalled();
  });

  it("responde 503 si Cloudflare no responde", async () => {
    const d = deps({ verifyTurnstile: vi.fn(async () => Promise.reject(new TurnstileUnavailableError())) });

    const res = await post(build(d));

    expect(res.status).toBe(503);
    expect(d.repository.create).not.toHaveBeenCalled();
  });

  it("responde 415 si la foto no es una imagen aceptada aunque diga .jpg", async () => {
    const d = deps();

    const res = await post(build(d)).attach("reference", Buffer.from("<?php echo 1; ?>"), "foto.jpg");

    expect(res.status).toBe(415);
    expect(d.storage.put).not.toHaveBeenCalled();
    expect(d.repository.create).not.toHaveBeenCalled();
  });

  it("responde 413 si la foto pesa más de 8 MB", async () => {
    const d = deps();

    const res = await post(build(d)).attach("reference", Buffer.alloc(8 * 1024 * 1024 + 1), "grande.jpg");

    expect(res.status).toBe(413);
    expect(d.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("responde 400 si mandan dos fotos o con otro nombre de campo", async () => {
    const photo = await jpegWithExif();

    const two = await post(build(deps())).attach("reference", photo, "a.jpg").attach("reference", photo, "b.jpg");
    const other = await post(build(deps())).attach("avatar", photo, "a.jpg");

    expect(two.status).toBe(400);
    expect(other.status).toBe(400);
  });

  it("responde 503 con foto si R2 no está configurado, sin guardar el encargo", async () => {
    const d = deps({ storage: undefined });

    const res = await post(build(d)).attach("reference", await jpegWithExif(), "quetzal.jpg");

    expect(res.status).toBe(503);
    expect(d.repository.create).not.toHaveBeenCalled();
  });

  it("borra la foto subida si falla la base y responde 500 sin detalles", async () => {
    const d = deps({ repository: { create: vi.fn(async () => Promise.reject(new Error("Deadlock en db:3306"))) } });

    const res = await post(build(d)).attach("reference", await jpegWithExif(), "quetzal.jpg");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("db:3306");
    const [uploadedKey] = vi.mocked(d.storage.put).mock.calls[0] ?? [];
    expect(d.storage.remove).toHaveBeenCalledWith(uploadedKey);
  });

  it("limita los envíos por IP", async () => {
    const app = build(deps({ rateLimit: { windowMs: 60_000, limit: 2 } }));

    expect((await post(app)).status).toBe(201);
    expect((await post(app)).status).toBe(201);
    expect((await post(app)).status).toBe(429);
  });

  it("no monta la ruta si no hay dependencias (sin Turnstile no hay formulario)", async () => {
    const app = createApp({ allowedOrigins: ["https://scartstudios.com"], logger: silent });

    expect((await post(app)).status).toBe(404);
  });
});
