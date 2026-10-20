import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import pino from "pino";
import type { StoryDetailDto, StorySummaryDto, VideoDto } from "@sc-art-studio/shared";
import { createApp } from "../app.js";
import type { StoryRepository } from "../repositories/stories.js";
import type { VideoRepository } from "../repositories/videos.js";

const silent = pino({ level: "silent" });
const CACHE = "public, max-age=60, s-maxage=300";
const MASK_ID = "cmvg10y8k000m9ctzi6pv3rtr";

const STORY: StorySummaryDto = {
  slug: "de-bloque-a-jaguar",
  title: { es: "De bloque de madera a jaguar", en: "From wood block to jaguar" },
  coverKey: null,
  publishedAt: "2026-10-01T00:00:00.000Z",
  mask: { slug: "jaguar-dorado", name: { es: "Jaguar Dorado", en: "Golden Jaguar" } },
};
const STORY_DETAIL: StoryDetailDto = { ...STORY, body: { es: "<p>Hola</p>", en: "<p>Hi</p>" }, videos: [] };
const VIDEO: VideoDto = {
  id: "v1",
  platform: "YOUTUBE",
  url: "https://www.youtube.com/watch?v=abc",
  externalId: "abc",
  title: "Tallando",
  thumbnailUrl: null,
  publishedAt: null,
  mask: null,
  story: null,
};

function repos() {
  const stories: StoryRepository = {
    list: vi.fn(async () => ({ items: [STORY], total: 1 })),
    findBySlug: vi.fn(async (slug: string) => (slug === STORY.slug ? STORY_DETAIL : null)),
  };
  const videos: VideoRepository = { list: vi.fn(async () => ({ items: [VIDEO], total: 1 })) };
  return { stories, videos };
}

const build = (r = repos()) => createApp({ allowedOrigins: ["https://scartstudios.com"], logger: silent, ...r });

describe("GET /api/stories", () => {
  it("lista historias publicadas con paginación y caché", async () => {
    const r = repos();

    const res = await request(build(r)).get("/api/stories?page=2&limit=5");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [STORY], meta: { total: 1, page: 2, limit: 5 } });
    expect(res.headers["cache-control"]).toBe(CACHE);
    expect(r.stories.list).toHaveBeenCalledWith({ page: 2, limit: 5 });
  });

  it.each(["limit=0", "page=x", "offset=10"])("responde 400 con %s", async (query) => {
    const r = repos();

    const res = await request(build(r)).get(`/api/stories?${query}`);

    expect(res.status).toBe(400);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(r.stories.list).not.toHaveBeenCalled();
  });
});

describe("GET /api/stories/:slug", () => {
  it("devuelve la historia con caché", async () => {
    const res = await request(build()).get(`/api/stories/${STORY.slug}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: STORY_DETAIL });
    expect(res.headers["cache-control"]).toBe(CACHE);
  });

  it("responde 404 sin caché si no existe o no está publicada", async () => {
    const res = await request(build()).get("/api/stories/como-empezo");

    expect(res.status).toBe(404);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("responde 400 con un slug inválido sin consultar", async () => {
    const r = repos();

    expect((await request(build(r)).get("/api/stories/Con_Mayusculas")).status).toBe(400);
    expect(r.stories.findBySlug).not.toHaveBeenCalled();
  });
});

describe("GET /api/videos", () => {
  it("lista todos los videos con caché", async () => {
    const r = repos();

    const res = await request(build(r)).get("/api/videos");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [VIDEO], meta: { total: 1, page: 1, limit: 24 } });
    expect(res.headers["cache-control"]).toBe(CACHE);
    expect(r.videos.list).toHaveBeenCalledWith({ page: 1, limit: 24 });
  });

  it("filtra por maskId", async () => {
    const r = repos();

    await request(build(r)).get(`/api/videos?maskId=${MASK_ID}`);

    expect(r.videos.list).toHaveBeenCalledWith({ maskId: MASK_ID, page: 1, limit: 24 });
  });

  it.each(["maskId=", "maskId=../../etc", "maskId=x'%20OR%201=1", "platform=TIKTOK"])(
    "responde 400 con %s",
    async (query) => {
      const r = repos();

      expect((await request(build(r)).get(`/api/videos?${query}`)).status).toBe(400);
      expect(r.videos.list).not.toHaveBeenCalled();
    },
  );
});

describe("sin repositorios", () => {
  it("no monta las rutas de historias ni videos", async () => {
    const app = createApp({ allowedOrigins: ["https://scartstudios.com"], logger: silent });

    expect((await request(app).get("/api/stories")).status).toBe(404);
    expect((await request(app).get("/api/videos")).status).toBe(404);
  });
});
