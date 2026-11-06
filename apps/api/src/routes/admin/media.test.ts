// Tarea 41: resolver oEmbed, portadas de historia y limpieza del HTML al guardar.
import sharp from "sharp";
import request from "supertest";
import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { createTokenService } from "../../lib/tokens.js";
import { ACCESS_COOKIE, CSRF_HEADER } from "../../middleware/auth.js";
import type { AdminDeps } from "./index.js";

const silent = pino({ level: "silent" });
const tokens = createTokenService({ accessSecret: "a".repeat(32), refreshSecret: "b".repeat(32) });
const STORY_ID = "cmvg10y8k000m9ctzi6pv3rtr";

function fakeStore(current: Record<string, unknown> = {}) {
  return {
    list: vi.fn(async () => ({ items: [], total: 0 })),
    get: vi.fn(async (id: string) => (id === STORY_ID ? { id, coverR2Key: null, ...current } : null)),
    create: vi.fn(async (input: object) => ({ id: STORY_ID, ...input })),
    update: vi.fn(async (id: string, input: object) => ({ id, ...input })),
    remove: vi.fn(async () => true),
  };
}

function setup(extra: Partial<AdminDeps> = {}) {
  const stories = fakeStore((extra as { current?: Record<string, unknown> }).current);
  const app = createApp({
    allowedOrigins: ["https://scartstudios.com"],
    logger: silent,
    admin: { tokens, masks: fakeStore(), stories, videos: fakeStore(), ...extra } as unknown as AdminDeps,
  });
  return { app, stories };
}

const session = () => ({
  Cookie: `${ACCESS_COOKIE}=${tokens.signAccess({ sub: "u1", role: "EDITOR", sid: "fam1" })}`,
  [CSRF_HEADER]: tokens.csrfToken("fam1"),
});

describe("POST /api/admin/oembed/resolve", () => {
  it("devuelve lo que resuelve el servicio", async () => {
    const oembed = vi.fn(async () => ({ platform: "YOUTUBE", title: "Jaguar" }));
    const res = await request(setup({ oembed } as never).app)
      .post("/api/admin/oembed/resolve")
      .set(session())
      .send({ url: "https://youtu.be/dQw4w9WgXcQ" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Jaguar");
    expect(oembed).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ");
  });

  it("400 con un enlace que no es de las tres redes", async () => {
    const res = await request(setup().app).post("/api/admin/oembed/resolve").set(session()).send({ url: "https://vimeo.com/1" });
    expect(res.status).toBe(400);
  });

  it("401 sin sesión", async () => {
    const res = await request(setup().app).post("/api/admin/oembed/resolve").send({ url: "https://youtu.be/dQw4w9WgXcQ" });
    expect(res.status).toBe(401);
  });
});

describe("historias: HTML malicioso", () => {
  it("se elimina al guardar", async () => {
    const { app, stories } = setup();
    const res = await request(app)
      .post("/api/admin/stories")
      .set(session())
      .send({
        titleEs: "Jaguar",
        titleEn: "Jaguar",
        bodyEs: '<p onclick="x()">Hola<script>alert(1)</script></p><a href="javascript:alert(1)">mal</a><iframe src="https://e.vil"></iframe>',
        bodyEn: '<h2>Hi</h2><img src=x onerror=alert(1)><a href="https://scartstudios.com">ok</a>',
      });

    expect(res.status).toBe(201);
    const input = stories.create.mock.calls[0]?.[0] as { bodyEs: string; bodyEn: string; slug: string };
    expect(input.slug).toBe("jaguar");
    expect(input.bodyEs).toBe("<p>Hola</p><a rel=\"noopener noreferrer nofollow\" target=\"_blank\">mal</a>");
    expect(input.bodyEn).toBe(
      '<h2>Hi</h2><a href="https://scartstudios.com" rel="noopener noreferrer nofollow" target="_blank">ok</a>',
    );
  });
});

describe("POST /api/admin/stories/:id/cover", () => {
  const jpeg = () =>
    sharp({ create: { width: 2000, height: 1500, channels: 3, background: "#0a0" } })
      .jpeg()
      .withExif({ IFD0: { Artist: "secreto" } })
      .toBuffer();

  it("503 sin R2", async () => {
    const res = await request(setup().app)
      .post(`/api/admin/stories/${STORY_ID}/cover`)
      .set(session())
      .attach("cover", await jpeg(), "a.jpg");
    expect(res.status).toBe(503);
  });

  it("sube WebP 1200x630 sin EXIF, guarda la clave y borra la anterior", async () => {
    const storage = { put: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) };
    const { app, stories } = setup({
      media: { storage, publicUrl: "https://media.scartstudios.com" },
      current: { coverR2Key: "stories/vieja.webp" },
    } as never);

    const res = await request(app).post(`/api/admin/stories/${STORY_ID}/cover`).set(session()).attach("cover", await jpeg(), "a.jpg");

    expect(res.status).toBe(200);
    const [key, data, type] = storage.put.mock.calls[0] as unknown as [string, Buffer, string];
    expect(key).toMatch(new RegExp(`^stories/${STORY_ID}-\\d+\\.webp$`));
    expect(type).toBe("image/webp");
    const meta = await sharp(data).metadata();
    expect([meta.format, meta.width, meta.height, meta.exif]).toEqual(["webp", 1200, 630, undefined]);
    expect(stories.update).toHaveBeenCalledWith(STORY_ID, { coverR2Key: key }, expect.anything());
    expect(storage.remove).toHaveBeenCalledWith("stories/vieja.webp");
  });

  it("415 si no es imagen; 404 si la historia no existe", async () => {
    const storage = { put: vi.fn(), remove: vi.fn() };
    const { app } = setup({ media: { storage, publicUrl: "https://m.x" } } as never);
    expect(
      (await request(app).post(`/api/admin/stories/${STORY_ID}/cover`).set(session()).attach("cover", Buffer.from("hola"), "a.jpg")).status,
    ).toBe(415);
    expect(
      (await request(app).post("/api/admin/stories/cmvg10y8k000n9ctzi6pv3rts/cover").set(session()).attach("cover", await jpeg(), "a.jpg"))
        .status,
    ).toBe(404);
    expect(storage.put).not.toHaveBeenCalled();
  });
});
