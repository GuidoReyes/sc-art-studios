import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import pino from "pino";
import type { MaskDetailDto, MaskSummaryDto } from "@sc-art-studio/shared";
import { createApp } from "../app.js";
import type { MaskRepository } from "../repositories/masks.js";

const silent = pino({ level: "silent" });

const SUMMARY: MaskSummaryDto = {
  id: "m1",
  slug: "jaguar-dorado",
  name: { es: "Jaguar Dorado", en: "Golden Jaguar" },
  animal: "Jaguar",
  status: "AVAILABLE",
  priceUsd: 95,
  priceGtq: null,
  featured: true,
  publishedAt: "2026-10-19T00:00:00.000Z",
  shopifyProductId: null,
  image: null,
};

const DETAIL: MaskDetailDto = {
  ...SUMMARY,
  description: { es: "Descripción", en: "Description" },
  story: null,
  shopifyVariantId: null,
  weightGrams: 650,
  dimensionsCm: null,
  images: [],
  videos: [],
  stories: [],
};

function fakeRepo(overrides: Partial<MaskRepository> = {}): MaskRepository {
  return {
    list: vi.fn(async () => ({ items: [SUMMARY], total: 1 })),
    findBySlug: vi.fn(async (slug: string) => (slug === DETAIL.slug ? DETAIL : null)),
    ...overrides,
  };
}

const build = (masks: MaskRepository) =>
  createApp({ allowedOrigins: ["https://scartstudios.com"], logger: silent, masks });

describe("GET /api/masks", () => {
  it("lista con la página 1 y el tamaño por defecto", async () => {
    const masks = fakeRepo();

    const res = await request(build(masks)).get("/api/masks");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [SUMMARY], meta: { total: 1, page: 1, limit: 24 } });
    expect(masks.list).toHaveBeenCalledWith({ page: 1, limit: 24 });
  });

  it("pasa los filtros validados al repositorio", async () => {
    const masks = fakeRepo();

    const res = await request(build(masks)).get("/api/masks?status=SOLD&animal=%20Jaguar%20&page=2&limit=6");

    expect(res.status).toBe(200);
    expect(masks.list).toHaveBeenCalledWith({ status: "SOLD", animal: "Jaguar", page: 2, limit: 6 });
    expect(res.body.meta).toEqual({ total: 1, page: 2, limit: 6 });
  });

  it("envía Cache-Control para la CDN", async () => {
    const res = await request(build(fakeRepo())).get("/api/masks");

    expect(res.headers["cache-control"]).toBe("public, max-age=60, s-maxage=300");
  });

  it.each([
    ["status=DRAFT", "los borradores nunca son públicos"],
    ["status=available", "el estado distingue mayúsculas"],
    ["status=SOLD&status=AVAILABLE", "un solo estado"],
    ["limit=0", "límite mínimo"],
    ["limit=49", "límite máximo"],
    ["page=0", "página mínima"],
    ["page=abc", "página no numérica"],
    ["animal=", "animal vacío"],
    [`animal=${"x".repeat(81)}`, "animal demasiado largo"],
    ["utm_source=tiktok", "campo desconocido"],
  ])("responde 400 con %s (%s) sin llamar al repositorio", async (query) => {
    const masks = fakeRepo();

    const res = await request(build(masks)).get(`/api/masks?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Datos inválidos");
    expect(masks.list).not.toHaveBeenCalled();
    expect(res.headers["cache-control"]).not.toContain("public");
  });

  it("responde 500 sin detalles si falla la base", async () => {
    const masks = fakeRepo({ list: vi.fn(async () => Promise.reject(new Error("connect ECONNREFUSED db:3306"))) });

    const res = await request(build(masks)).get("/api/masks");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
  });
});

describe("GET /api/masks/:slug", () => {
  it("devuelve el detalle con caché", async () => {
    const res = await request(build(fakeRepo())).get("/api/masks/jaguar-dorado");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: DETAIL });
    expect(res.headers["cache-control"]).toBe("public, max-age=60, s-maxage=300");
  });

  it("responde 404 sin caché pública si no existe o es borrador", async () => {
    const res = await request(build(fakeRepo())).get("/api/masks/lobo-florido");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "No encontrado" });
    expect(res.headers["cache-control"]).not.toContain("public");
  });

  it.each(["Jaguar-Dorado", "jaguar_dorado", "-jaguar", "a".repeat(121)])(
    "responde 400 con el slug inválido %s sin consultar",
    async (slug) => {
      const masks = fakeRepo();

      const res = await request(build(masks)).get(`/api/masks/${slug}`);

      expect(res.status).toBe(400);
      expect(masks.findBySlug).not.toHaveBeenCalled();
    },
  );
});

describe("sin repositorio", () => {
  it("no monta las rutas de máscaras", async () => {
    const app = createApp({ allowedOrigins: ["https://scartstudios.com"], logger: silent });

    expect((await request(app).get("/api/masks")).status).toBe(404);
  });
});
