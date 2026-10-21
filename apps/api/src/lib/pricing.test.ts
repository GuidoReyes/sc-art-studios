import { describe, expect, it } from "vitest";
import { Prisma } from "../generated/prisma/client.js";
import {
  type PricingSettings,
  commissionPct,
  fixedCostPerPieceGtq,
  priceForMargin,
  suggestionMargins,
  toMoney,
  unitCost,
} from "./pricing.js";

const d = (value: string | number) => new Prisma.Decimal(value);

// Los valores del seed (PRD §6.2).
const SETTINGS: PricingSettings = {
  fxUsdGtq: d("7.6450"),
  gatewayPct: d("5.40"),
  gatewayFixedUsd: d("0.30"),
  shopifyThirdPartyPct: d("2.00"),
  monthlyFixedUsd: d("54.94"),
  expectedUnitsPerMonth: 8,
  laborRateGtqPerHour: d("25.00"),
  targetMarginPct: d("40.00"),
};
const PIECE = { materialsCostGtq: 120, laborHours: 6, packagingCostGtq: d("45.00") };

describe("costo unitario (PRD §6.3, pasos 1 y 2)", () => {
  it("costo fijo por pieza: 54.94 × 7.645 ÷ 8 = Q52.50", () => {
    expect(toMoney(fixedCostPerPieceGtq(SETTINGS))).toBe(52.5);
  });

  it("120 + 6 × 25 + 45 + 52.50 = Q367.50 = US$48.07", () => {
    const cost = unitCost(PIECE, SETTINGS);

    expect([cost.materialsGtq, cost.laborGtq, cost.packagingGtq, cost.fixedGtq].map(toMoney)).toEqual([120, 150, 45, 52.5]);
    expect(toMoney(cost.totalGtq)).toBe(367.5);
    expect(toMoney(cost.totalUsd)).toBe(48.07);
  });

  it("horas con decimales no arrastran errores de punto flotante", () => {
    // 0.1 + 0.2 en float da 0.30000000000000004; con Decimal, 2.3 h × Q25 = Q57.50 exactos.
    expect(unitCost({ ...PIECE, laborHours: 2.3 }, SETTINGS).laborGtq.toString()).toBe("57.5");
  });

  it.each([
    ["piezas al mes en 0", { expectedUnitsPerMonth: 0 }],
    ["tipo de cambio en 0", { fxUsdGtq: d(0) }],
  ])("CostSettings inválida: %s", (_name, override) => {
    expect(() => unitCost(PIECE, { ...SETTINGS, ...override })).toThrow(expect.objectContaining({ code: "INVALID_SETTINGS" }));
  });
});

describe("precio mínimo por margen (PRD §6.3, paso 3)", () => {
  const costUsd = unitCost(PIECE, SETTINGS).totalUsd;

  it("las comisiones suman 7.4 %", () => {
    expect(commissionPct(SETTINGS).toNumber()).toBe(7.4);
  });

  it.each([
    [30, 77.27],
    [40, 91.96],
    [50, 113.55],
  ])("margen %i %% → US$%d", (margin, price) => {
    expect(priceForMargin(costUsd, d(margin), SETTINGS).priceUsd.toNumber()).toBe(price);
  });

  it("al redondear hacia arriba el margen real nunca queda por debajo del pedido", () => {
    for (const margin of [0, 12.5, 30, 40, 50, 92.5]) {
      const option = priceForMargin(costUsd, d(margin), SETTINGS);

      expect(option.profitUsd.div(option.priceUsd).mul(100).gte(margin)).toBe(true);
    }
  });

  it("utilidad = precio − comisiones − costo, en dólares y en quetzales", () => {
    const option = priceForMargin(costUsd, d(40), SETTINGS);

    // 91.96 × 7.4 % + 0.30 = 7.11 de comisiones; 91.96 − 7.11 − 48.07 = 36.78 = Q281.21
    expect(toMoney(option.feesUsd)).toBe(7.11);
    expect(toMoney(option.profitUsd)).toBe(36.78);
    expect(toMoney(option.profitGtq)).toBe(281.21);
  });

  it.each([92.6, 100, -1])("margen %d %% no se puede alcanzar", (margin) => {
    expect(() => priceForMargin(costUsd, d(margin), SETTINGS)).toThrow(
      expect.objectContaining({ code: "MARGIN_UNREACHABLE" }),
    );
  });
});

describe("suggestionMargins", () => {
  it("objetivo ± el paso: con el seed 30, 40 y 50", () => {
    expect(suggestionMargins(SETTINGS, 10).map(Number)).toEqual([30, 40, 50]);
  });

  it("sigue a CostSettings y omite lo que no se alcanza", () => {
    expect(suggestionMargins({ ...SETTINGS, targetMarginPct: d(5) }, 10).map(Number)).toEqual([5, 15]);
    expect(suggestionMargins({ ...SETTINGS, targetMarginPct: d(85) }, 10).map(Number)).toEqual([75, 85]);
  });
});
