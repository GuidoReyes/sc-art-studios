import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import pino from "pino";
import { createApp } from "../app.js";
import type { RateCandidate } from "../lib/shipping.js";
import type { MaskParcelResult, ShippingRepository } from "../repositories/shipping.js";
import type { ShippingDeps } from "./shipping.js";

const silent = pino({ level: "silent" });
const NOW = new Date("2026-10-20T12:00:00.000Z");
const MASK_ID = "cmgx1y2z30000abcd1234efgh";

const economy = (maxWeightGrams: number, costCents: number): RateCandidate => ({
  carrier: "FEDEX",
  service: "International Economy",
  maxWeightGrams,
  costCents,
  isEstimate: true,
});

// Tramos de la zona C del seed (PRD §6.4).
const ZONE_C = {
  code: "FEDEX-C",
  rates: [
    economy(1000, 13880),
    economy(2000, 17960),
    economy(3000, 22740),
    economy(5000, 33700),
    { ...economy(3000, 26430), service: "International Priority" },
  ],
};

const FOUND: MaskParcelResult = {
  status: "found",
  parcel: { weightGrams: 850, lengthCm: 30, widthCm: 25, heightCm: 20 },
};

function deps(overrides: Partial<ShippingRepository> = {}, extra: Partial<ShippingDeps> = {}) {
  const repository: ShippingRepository = {
    findMaskParcel: vi.fn(async () => FOUND),
    findZoneRates: vi.fn(async () => ZONE_C),
    findQuoteSettings: vi.fn(async () => ({ volumetricDivisor: 5000, commissionBasisPoints: 740 })),
    ...overrides,
  };
  return { repository, now: () => NOW, ...extra };
}

const build = (shipping: ShippingDeps) =>
  createApp({ allowedOrigins: ["https://scartstudios.com"], logger: silent, shipping });

const quote = (shipping: ShippingDeps, body: object) => request(build(shipping)).post("/api/shipping/quote").send(body);

describe("POST /api/shipping/quote", () => {
  it("cotiza una máscara empacada con el peso volumétrico y cobra más que el costo", async () => {
    const d = deps();

    const res = await quote(d, { country: " us ", maskId: MASK_ID });

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toEqual({
      data: {
        country: "US",
        zone: "FEDEX-C",
        // 30 × 25 × 20 cm ÷ 5000 = 3 kg volumétricos > 850 g reales
        weightGrams: { actual: 850, volumetric: 3000, billable: 3000 },
        options: [
          // 227.40 ÷ 0.926 = 245.572… → 245.58
          { carrier: "FEDEX", service: "International Economy", chargeUsd: 245.58, isEstimate: true },
          { carrier: "FEDEX", service: "International Priority", chargeUsd: 285.43, isEstimate: true },
        ],
      },
    });
    expect(res.body.data.options[0].chargeUsd).toBeGreaterThan(227.4);
    expect(d.repository.findMaskParcel).toHaveBeenCalledWith(MASK_ID);
    expect(d.repository.findZoneRates).toHaveBeenCalledWith("US", NOW);
  });

  it("nunca expone el costo interno del envío", async () => {
    const res = await quote(deps(), { country: "US", maskId: MASK_ID });

    expect(JSON.stringify(res.body)).not.toMatch(/cost/i);
  });

  it("cotiza un paquete con peso y medidas a mano", async () => {
    const d = deps();

    const res = await quote(d, { country: "MX", weightGrams: 1800, lengthCm: 20, widthCm: 15, heightCm: 10.5 });

    expect(res.status).toBe(200);
    // 20 × 15 × 10.5 = 3150 cm³ ÷ 5000 = 630 g: manda el peso real
    expect(res.body.data.weightGrams).toEqual({ actual: 1800, volumetric: 630, billable: 1800 });
    // 179.60 ÷ 0.926 = 193.952… → 193.96
    expect(res.body.data.options[0]).toEqual({
      carrier: "FEDEX",
      service: "International Economy",
      chargeUsd: 193.96,
      isEstimate: true,
    });
    expect(d.repository.findMaskParcel).not.toHaveBeenCalled();
  });

  it("país sin zona: 200 sin opciones para que la web ofrezca escribir", async () => {
    const res = await quote(deps({ findZoneRates: vi.fn(async () => null) }), { country: "GT", maskId: MASK_ID });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ country: "GT", zone: null, options: [] });
  });

  it("paquete más pesado que el tramo más alto: sin opciones", async () => {
    const res = await quote(deps(), { country: "US", weightGrams: 6000, lengthCm: 10, widthCm: 10, heightCm: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.options).toEqual([]);
  });

  it("404 si la máscara no existe o es borrador", async () => {
    const res = await quote(deps({ findMaskParcel: vi.fn(async () => ({ status: "not-found" }) as const) }), {
      country: "US",
      maskId: MASK_ID,
    });

    expect(res.status).toBe(404);
  });

  it("422 si la máscara aún no tiene peso o empaque", async () => {
    const res = await quote(deps({ findMaskParcel: vi.fn(async () => ({ status: "incomplete" }) as const) }), {
      country: "US",
      maskId: MASK_ID,
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Escríbenos/);
  });

  it.each([
    ["país inexistente", { country: "XX", maskId: MASK_ID }],
    ["país de tres letras", { country: "USA", maskId: MASK_ID }],
    ["maskId que no es cuid", { country: "US", maskId: "1; DROP TABLE" }],
    ["maskId y medidas a la vez", { country: "US", maskId: MASK_ID, weightGrams: 900, lengthCm: 1, widthCm: 1, heightCm: 1 }],
    ["faltan medidas", { country: "US", weightGrams: 900 }],
    ["peso con decimales", { country: "US", weightGrams: 900.5, lengthCm: 10, widthCm: 10, heightCm: 10 }],
    ["peso como texto", { country: "US", weightGrams: "900", lengthCm: 10, widthCm: 10, heightCm: 10 }],
    ["medida cero", { country: "US", weightGrams: 900, lengthCm: 0, widthCm: 10, heightCm: 10 }],
    ["peso sobre el tope", { country: "US", weightGrams: 68_001, lengthCm: 10, widthCm: 10, heightCm: 10 }],
    ["lado sobre el tope", { country: "US", weightGrams: 900, lengthCm: 275, widthCm: 10, heightCm: 10 }],
    ["campo desconocido", { country: "US", maskId: MASK_ID, price: 1 }],
    ["cuerpo vacío", {}],
  ])("400 con %s", async (_name, body) => {
    const d = deps();

    const res = await quote(d, body);

    expect(res.status).toBe(400);
    expect(d.repository.findZoneRates).not.toHaveBeenCalled();
  });

  it("500 sin detalles si falta CostSettings", async () => {
    const res = await quote(deps({ findQuoteSettings: vi.fn(async () => null) }), { country: "US", maskId: MASK_ID });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno" });
  });

  it("aplica su rate limit (429 al pasarse)", async () => {
    const app = build(deps({}, { rateLimit: { windowMs: 60_000, limit: 2 } }));
    const send = () => request(app).post("/api/shipping/quote").send({ country: "US", maskId: MASK_ID });

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });

  it("solo acepta POST", async () => {
    const res = await request(build(deps())).get("/api/shipping/quote");

    expect(res.status).toBe(404);
  });
});
