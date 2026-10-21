import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import pino from "pino";
import { createApp } from "../../app.js";
import { HttpError } from "../../lib/httpErrors.js";
import { createTokenService } from "../../lib/tokens.js";
import { ACCESS_COOKIE, CSRF_HEADER } from "../../middleware/auth.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { PricingRepository } from "../../repositories/admin/pricing.js";
import type { AdminStore } from "../../repositories/admin/store.js";
import type { AdminDeps } from "./index.js";

const silent = pino({ level: "silent" });
const tokens = createTokenService({ accessSecret: "a".repeat(32), refreshSecret: "b".repeat(32) });
const MASK_ID = "cmvg10y8k000m9ctzi6pv3rtr";
const OTHER_ID = "cmvg10y8k000n9ctzi6pv3rts";
const YOUTUBE = "https://youtu.be/dQw4w9WgXcQ?si=rastreo";

// Store falso: devuelve lo que recibe para poder revisar lo que la ruta validó.
function fakeStore() {
  return {
    list: vi.fn(async () => ({ items: [{ id: MASK_ID }], total: 1 })),
    get: vi.fn(async (id: string) => (id === MASK_ID ? { id } : null)),
    create: vi.fn(async (input: object) => ({ id: MASK_ID, ...input })),
    update: vi.fn(async (id: string, input: object) => (id === MASK_ID ? { id, ...input } : null)),
    remove: vi.fn(async (id: string) => id === MASK_ID),
  } satisfies AdminStore<{ id: string }, never, never, never>;
}

const d = (value: string | number) => new Prisma.Decimal(value);

// CostSettings y caja del seed (PRD §6.2).
const SEED_SETTINGS = {
  fxUsdGtq: d("7.6450"),
  gatewayPct: d("5.40"),
  gatewayFixedUsd: d("0.30"),
  shopifyThirdPartyPct: d("2.00"),
  monthlyFixedUsd: d("54.94"),
  expectedUnitsPerMonth: 8,
  laborRateGtqPerHour: d("25.00"),
  targetMarginPct: d("40.00"),
  updatedAt: new Date("2026-10-13T00:00:00.000Z"),
};

function fakePricing() {
  return {
    findSettings: vi.fn(async (): Promise<typeof SEED_SETTINGS | null> => SEED_SETTINGS),
    findPackagingCostGtq: vi.fn(async (id: string) => (id === MASK_ID ? d("45.00") : null)),
  } satisfies PricingRepository;
}

function setup(extra: Partial<AdminDeps> = {}) {
  const stores = { masks: fakeStore(), stories: fakeStore(), videos: fakeStore(), pricing: fakePricing() };
  const app = createApp({
    allowedOrigins: ["https://scartstudios.com"],
    logger: silent,
    admin: { tokens, ...stores, ...extra } as unknown as AdminDeps,
  });
  return { app, ...stores };
}

const session = (sub = "u1", role: "OWNER" | "EDITOR" = "EDITOR", sid = "fam1") => ({
  Cookie: `${ACCESS_COOKIE}=${tokens.signAccess({ sub, role, sid })}`,
  [CSRF_HEADER]: tokens.csrfToken(sid),
});

const MASK = { nameEs: "Jaguar Dorado", nameEn: "Golden Jaguar", animal: "jaguar", descriptionEs: "Tallada", descriptionEn: "Carved" };

describe("/api/admin: acceso", () => {
  it("401 sin sesión, también en GET", async () => {
    const res = await request(setup().app).get("/api/admin/masks");

    expect(res.status).toBe(401);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("403 sin CSRF al escribir", async () => {
    const { app, masks } = setup();
    const { Cookie } = session();

    const res = await request(app).post("/api/admin/masks").set("Cookie", Cookie).send(MASK);

    expect(res.status).toBe(403);
    expect(masks.create).not.toHaveBeenCalled();
  });

  it("el límite cuenta por usuario, no por IP", async () => {
    const { app } = setup({ rateLimit: { windowMs: 60_000, limit: 2 } });

    for (let i = 0; i < 2; i += 1) expect((await request(app).get("/api/admin/masks").set(session("u1"))).status).toBe(200);
    expect((await request(app).get("/api/admin/masks").set(session("u1"))).status).toBe(429);
    expect((await request(app).get("/api/admin/masks").set(session("u2", "OWNER", "fam2"))).status).toBe(200);
  });
});

describe("/api/admin/masks", () => {
  it("lista con meta y filtro de estado, borradores incluidos", async () => {
    const { app, masks } = setup();

    const res = await request(app).get("/api/admin/masks?status=DRAFT&page=2&limit=5").set(session());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ id: MASK_ID }], meta: { total: 1, page: 2, limit: 5 } });
    expect(masks.list).toHaveBeenCalledWith({ status: "DRAFT", page: 2, limit: 5 });
  });

  it("ver una: 200 o 404; un id raro es 400", async () => {
    const { app } = setup();

    expect((await request(app).get(`/api/admin/masks/${MASK_ID}`).set(session())).body).toEqual({ data: { id: MASK_ID } });
    expect((await request(app).get(`/api/admin/masks/${OTHER_ID}`).set(session())).status).toBe(404);
    expect((await request(app).get("/api/admin/masks/1%20OR%201").set(session())).status).toBe(400);
  });

  it("crea con slug a partir del nombre en inglés y registra quién fue", async () => {
    const { app, masks } = setup();

    const res = await request(app)
      .post("/api/admin/masks")
      .set(session())
      .send({ ...MASK, storyEs: "  ", priceUsd: 245.5, lengthCm: 30.5, packagingProfileId: null });

    expect(res.status).toBe(201);
    expect(masks.create).toHaveBeenCalledWith(
      { ...MASK, slug: "golden-jaguar", storyEs: null, priceUsd: 245.5, lengthCm: 30.5, packagingProfileId: null },
      { userId: "u1", ip: expect.any(String) },
    );
  });

  it.each([
    ["sin nombre", { ...MASK, nameEs: "" }],
    ["campo desconocido", { ...MASK, shopifyProductId: "gid://x" }],
    ["slug con espacios", { ...MASK, slug: "Mi Máscara" }],
    ["precio negativo", { ...MASK, priceUsd: -1 }],
    ["tres decimales", { ...MASK, priceUsd: 1.005 }],
    ["peso con decimales", { ...MASK, weightGrams: 850.5 }],
    ["lado más grande que un bulto", { ...MASK, lengthCm: 300 }],
    ["estado inexistente", { ...MASK, status: "ARCHIVED" }],
    ["empaque que no es id", { ...MASK, packagingProfileId: "caja-1" }],
    ["nombre en inglés sin letras", { ...MASK, nameEn: "¿?" }],
  ])("400: %s", async (_name, body) => {
    const { app, masks } = setup();

    expect((await request(app).post("/api/admin/masks").set(session()).send(body)).status).toBe(400);
    expect(masks.create).not.toHaveBeenCalled();
  });

  it("PUT parcial; vacío es 400 y si no existe 404", async () => {
    const { app, masks } = setup();

    const res = await request(app).put(`/api/admin/masks/${MASK_ID}`).set(session()).send({ featured: true, status: "AVAILABLE" });

    expect(res.status).toBe(200);
    expect(masks.update).toHaveBeenCalledWith(MASK_ID, { featured: true, status: "AVAILABLE" }, expect.objectContaining({ userId: "u1" }));
    expect((await request(app).put(`/api/admin/masks/${MASK_ID}`).set(session()).send({})).status).toBe(400);
    expect((await request(app).put(`/api/admin/masks/${OTHER_ID}`).set(session()).send({ featured: true })).status).toBe(404);
  });

  it("DELETE: 204, 404 o el 409 de la regla de negocio con su código", async () => {
    const { app, masks } = setup();

    expect((await request(app).delete(`/api/admin/masks/${MASK_ID}`).set(session())).status).toBe(204);
    expect((await request(app).delete(`/api/admin/masks/${OTHER_ID}`).set(session())).status).toBe(404);

    masks.remove.mockRejectedValueOnce(new HttpError(409, "No se puede eliminar una máscara vendida", "MASK_SOLD"));
    const sold = await request(app).delete(`/api/admin/masks/${MASK_ID}`).set(session());
    expect(sold.status).toBe(409);
    expect(sold.body).toEqual({ error: "No se puede eliminar una máscara vendida", code: "MASK_SOLD" });
  });
});

describe("/api/admin/stories", () => {
  const STORY = { titleEs: "De bloque a jaguar", titleEn: "From block to jaguar", bodyEs: "<p>Hola</p>", bodyEn: "<p>Hi</p>" };

  it("sanitiza el cuerpo y convierte la fecha", async () => {
    const { app, stories } = setup();

    const res = await request(app)
      .post("/api/admin/stories")
      .set(session())
      .send({ ...STORY, bodyEs: '<p onclick="x()">Hola</p><script>alert(1)</script>', publishedAt: "2026-10-20T10:00:00-06:00" });

    expect(res.status).toBe(201);
    expect(stories.create).toHaveBeenCalledWith(
      { ...STORY, slug: "from-block-to-jaguar", bodyEs: "<p>Hola</p>", publishedAt: new Date("2026-10-20T16:00:00.000Z") },
      expect.anything(),
    );
  });

  it.each([
    ["cuerpo que queda vacío", { ...STORY, bodyEn: "<script>alert(1)</script>" }],
    ["fecha sin zona", { ...STORY, publishedAt: "2026-10-20 10:00" }],
    ["coverR2Key a mano", { ...STORY, coverR2Key: "otro/archivo.webp" }],
  ])("400: %s", async (_name, body) => {
    expect((await request(setup().app).post("/api/admin/stories").set(session()).send(body)).status).toBe(400);
  });

  it("PUT: despublicar con null", async () => {
    const { app, stories } = setup();

    await request(app).put(`/api/admin/stories/${MASK_ID}`).set(session()).send({ publishedAt: null, maskId: OTHER_ID });

    expect(stories.update).toHaveBeenCalledWith(MASK_ID, { publishedAt: null, maskId: OTHER_ID }, expect.anything());
  });

  it("lista paginada", async () => {
    const { app, stories } = setup();

    expect((await request(app).get("/api/admin/stories").set(session())).status).toBe(200);
    expect(stories.list).toHaveBeenCalledWith({ page: 1, limit: 24 });
  });
});

describe("/api/admin/videos", () => {
  it("deduce plataforma e id de la URL", async () => {
    const { app, videos } = setup();

    const res = await request(app).post("/api/admin/videos").set(session()).send({ url: YOUTUBE, title: "Tallando", maskId: MASK_ID });

    expect(res.status).toBe(201);
    expect(videos.create).toHaveBeenCalledWith(
      {
        title: "Tallando",
        maskId: MASK_ID,
        platform: "YOUTUBE",
        externalId: "dQw4w9WgXcQ",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
      expect.anything(),
    );
  });

  it.each([
    ["sitio no permitido", { url: "https://vimeo.com/123", title: "x" }],
    ["miniatura por http", { url: YOUTUBE, title: "x", thumbnailUrl: "http://img.test/a.jpg" }],
    ["plataforma a mano", { url: YOUTUBE, title: "x", platform: "TIKTOK" }],
    ["source a mano", { url: YOUTUBE, title: "x", source: "SYNC" }],
  ])("400: %s", async (_name, body) => {
    expect((await request(setup().app).post("/api/admin/videos").set(session()).send(body)).status).toBe(400);
  });

  it("PUT con URL nueva la vuelve a analizar; sin URL deja la de antes", async () => {
    const { app, videos } = setup();

    await request(app)
      .put(`/api/admin/videos/${MASK_ID}`)
      .set(session())
      .send({ url: "https://www.tiktok.com/@scartstudios/video/7312345678901234567" });
    await request(app).put(`/api/admin/videos/${MASK_ID}`).set(session()).send({ title: "Nuevo" });

    expect(videos.update).toHaveBeenNthCalledWith(
      1,
      MASK_ID,
      { platform: "TIKTOK", externalId: "7312345678901234567", url: "https://www.tiktok.com/@scartstudios/video/7312345678901234567" },
      expect.anything(),
    );
    expect(videos.update).toHaveBeenNthCalledWith(2, MASK_ID, { title: "Nuevo" }, expect.anything());
  });

  it("filtra por máscara", async () => {
    const { app, videos } = setup();

    await request(app).get(`/api/admin/videos?maskId=${MASK_ID}`).set(session());

    expect(videos.list).toHaveBeenCalledWith({ maskId: MASK_ID, page: 1, limit: 24 });
  });
});

describe("/api/admin/pricing/suggest", () => {
  const PIECE = { materialsCostGtq: 120, laborHours: 6, packagingProfileId: MASK_ID };
  const option = (marginPct: number, priceUsd: number) => expect.objectContaining({ marginPct, priceUsd });

  it("ejemplo del PRD §6.3: Q367.50 = US$48.07 y precios con márgenes 30/40/50", async () => {
    const { app, pricing } = setup();

    const res = await request(app).post("/api/admin/pricing/suggest").set(session()).send(PIECE);

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(pricing.findPackagingCostGtq).toHaveBeenCalledWith(MASK_ID);
    expect(res.body.data.costBreakdown).toEqual({
      materialsGtq: 120,
      laborGtq: 150,
      packagingGtq: 45,
      fixedGtq: 52.5,
      totalGtq: 367.5,
      totalUsd: 48.07,
    });
    expect(res.body.data.suggestedPrices).toEqual([option(30, 77.27), option(40, 91.96), option(50, 113.55)]);
    expect(res.body.data.targetPrice).toEqual({ marginPct: 40, priceUsd: 91.96, feesUsd: 7.11, profitUsd: 36.78, profitGtq: 281.21 });
    expect(res.body.data.settings).toMatchObject({ fxUsdGtq: 7.645, commissionPct: 7.4, targetMarginPct: 40, updatedAt: "2026-10-13T00:00:00.000Z" });
  });

  it("el margen objetivo sale de CostSettings, no del código", async () => {
    const { app, pricing } = setup();
    pricing.findSettings.mockResolvedValueOnce({ ...SEED_SETTINGS, targetMarginPct: d(35) });

    const res = await request(app).post("/api/admin/pricing/suggest").set(session()).send(PIECE);

    expect(res.body.data.suggestedPrices.map((o: { marginPct: number }) => o.marginPct)).toEqual([25, 35, 45]);
    expect(res.body.data.targetPrice.marginPct).toBe(35);
  });

  it.each([
    ["sin empaque", { materialsCostGtq: 120, laborHours: 6 }],
    ["horas negativas", { ...PIECE, laborHours: -1 }],
    ["tres decimales", { ...PIECE, materialsCostGtq: 1.005 }],
    ["texto en vez de número", { ...PIECE, materialsCostGtq: "120" }],
    ["campo desconocido", { ...PIECE, marginPct: 90 }],
  ])("400: %s", async (_name, body) => {
    const { app, pricing } = setup();

    expect((await request(app).post("/api/admin/pricing/suggest").set(session()).send(body)).status).toBe(400);
    expect(pricing.findSettings).not.toHaveBeenCalled();
  });

  it("422 si el perfil de empaque no existe", async () => {
    const res = await request(setup().app)
      .post("/api/admin/pricing/suggest")
      .set(session())
      .send({ ...PIECE, packagingProfileId: OTHER_ID });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("INVALID_REFERENCE");
  });

  it("422 con código si CostSettings no permite calcular", async () => {
    const { app, pricing } = setup();
    pricing.findSettings.mockResolvedValueOnce({ ...SEED_SETTINGS, targetMarginPct: d(95) });

    const res = await request(app).post("/api/admin/pricing/suggest").set(session()).send(PIECE);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("MARGIN_UNREACHABLE");
  });

  it("500 genérico si falta el seed de CostSettings", async () => {
    const { app, pricing } = setup();
    pricing.findSettings.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/admin/pricing/suggest").set(session()).send(PIECE);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno" });
  });

  it("exige sesión y CSRF como el resto del admin", async () => {
    const { app } = setup();

    expect((await request(app).post("/api/admin/pricing/suggest").send(PIECE)).status).toBe(401);
    expect((await request(app).post("/api/admin/pricing/suggest").set("Cookie", session().Cookie).send(PIECE)).status).toBe(403);
  });
});
