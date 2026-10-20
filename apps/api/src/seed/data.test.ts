import { describe, expect, it } from "vitest";
import { COST_SETTINGS, MASKS, PACKAGING_PROFILE, SHIPPING_RATES, SHIPPING_ZONES } from "./data.js";

describe("zonas de envío", () => {
  it("define las zonas C, E y F de FedEx con países ISO alfa-2", () => {
    expect(SHIPPING_ZONES.map((zone) => zone.code)).toEqual(["FEDEX-C", "FEDEX-E", "FEDEX-F"]);
    for (const zone of SHIPPING_ZONES) {
      expect(zone.countries.length).toBeGreaterThan(0);
      for (const country of zone.countries) expect(country).toMatch(/^[A-Z]{2}$/);
    }
  });
});

describe("tarifas FedEx (PRD §6.4)", () => {
  it("cada tarifa apunta a una zona definida", () => {
    const codes = new Set(SHIPPING_ZONES.map((zone) => zone.code));
    for (const rate of SHIPPING_RATES) expect(codes.has(rate.zoneCode)).toBe(true);
  });

  it("copia los valores de la guía FedEx GT 2026", () => {
    const find = (zoneCode: string, service: string, maxWeightKg: string) =>
      SHIPPING_RATES.find((r) => r.zoneCode === zoneCode && r.service === service && r.maxWeightKg === maxWeightKg)
        ?.costUsd;

    expect(find("FEDEX-C", "International Economy", "1.0")).toBe("138.80");
    expect(find("FEDEX-C", "International Economy", "2.0")).toBe("179.60");
    expect(find("FEDEX-C", "International Economy", "5.0")).toBe("337.00");
    expect(find("FEDEX-E", "International Economy", "2.0")).toBe("241.30");
    expect(find("FEDEX-F", "International Economy", "2.0")).toBe("277.00");
    expect(find("FEDEX-C", "International Priority", "2.0")).toBe("209.00");
  });

  it("no repite la misma combinación de zona, servicio y peso", () => {
    const keys = SHIPPING_RATES.map((r) => `${r.zoneCode}|${r.service}|${r.maxWeightKg}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("todas citan la fuente y son FedEx", () => {
    for (const rate of SHIPPING_RATES) {
      expect(rate.carrier).toBe("FEDEX");
      expect(rate.source).toMatch(/^https:\/\/www\.fedex\.com\//);
    }
  });
});

describe("parámetros de costos (PRD §6.2)", () => {
  it("separa la comisión de PayPal de la de Shopify: juntas suman 7.4 %", () => {
    expect(COST_SETTINGS.gatewayPct).toBe("5.40");
    expect(COST_SETTINGS.shopifyThirdPartyPct).toBe("2.00");
    expect(Number(COST_SETTINGS.gatewayPct) + Number(COST_SETTINGS.shopifyThirdPartyPct)).toBeCloseTo(7.4);
  });

  it("usa el tipo de cambio verificado y el arancel de EE. UU.", () => {
    expect(COST_SETTINGS.fxUsdGtq).toBe("7.6450");
    expect(COST_SETTINGS.usImportDutyPct).toBe("10.00");
  });
});

describe("empaque", () => {
  it("queda marcado como supuesto hasta cotizar la caja", () => {
    expect(PACKAGING_PROFILE.name).toMatch(/supuesto/i);
    expect(PACKAGING_PROFILE.costGtq).toBe("45.00");
  });
});

describe("máscaras del diseño de referencia", () => {
  it("son las 4 del PRD, en borrador y sin precio ni producto de Shopify", () => {
    expect(MASKS.map((mask) => mask.nameEs)).toEqual(["Jaguar Dorado", "Lobo Florido", "Venado Rosa", "Cebra Mágica"]);
    for (const mask of MASKS) {
      expect(mask.status).toBe("DRAFT");
      expect(mask).not.toHaveProperty("priceUsd");
      expect(mask).not.toHaveProperty("shopifyProductId");
    }
  });

  it("tienen slugs únicos en minúsculas y sin acentos", () => {
    const slugs = MASKS.map((mask) => mask.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
