import { describe, expect, it } from "vitest";
import { type RateCandidate, chargeCents, parcelWeights, quoteRates, volumetricGrams } from "./shipping.js";

const BOX = { weightGrams: 850, lengthCm: 30, widthCm: 25, heightCm: 20 };

const rate = (service: string, maxWeightGrams: number, costCents: number): RateCandidate => ({
  carrier: "FEDEX",
  service,
  maxWeightGrams,
  costCents,
  isEstimate: true,
});

describe("volumetricGrams", () => {
  it("calcula (L × A × H) ÷ divisor en gramos", () => {
    // 30 × 25 × 20 = 15 000 cm³ ÷ 5000 = 3 kg
    expect(volumetricGrams(BOX, 5000)).toBe(3000);
  });

  it("acepta décimas de cm sin errores de punto flotante y redondea hacia arriba", () => {
    // 10.1 × 10.1 × 10.1 = 1030.301 cm³ ÷ 5000 = 206.0602 g → 207
    expect(volumetricGrams({ ...BOX, lengthCm: 10.1, widthCm: 10.1, heightCm: 10.1 }, 5000)).toBe(207);
  });

  it("rechaza un divisor que no sea un entero positivo", () => {
    expect(() => volumetricGrams(BOX, 0)).toThrow("Divisor volumétrico inválido");
    expect(() => volumetricGrams(BOX, 5000.5)).toThrow("Divisor volumétrico inválido");
  });
});

describe("parcelWeights", () => {
  it("factura el volumétrico cuando la caja pesa menos de lo que ocupa", () => {
    expect(parcelWeights(BOX, 5000)).toEqual({ actual: 850, volumetric: 3000, billable: 3000 });
  });

  it("factura el peso real cuando es mayor", () => {
    expect(parcelWeights({ ...BOX, weightGrams: 4200 }, 5000)).toEqual({
      actual: 4200,
      volumetric: 3000,
      billable: 4200,
    });
  });
});

describe("chargeCents", () => {
  it("cubre las comisiones: costo ÷ (1 − 7.4 %) hacia arriba al centavo (PRD §6.4)", () => {
    // 179.60 ÷ 0.926 = 193.952… → 193.96
    expect(chargeCents(17960, 740)).toBe(19396);
  });

  it("después de quitar las comisiones queda al menos el costo", () => {
    const charge = chargeCents(13880, 740);
    expect(charge - Math.floor((charge * 740) / 10_000)).toBeGreaterThanOrEqual(13880);
  });

  it("sin comisión cobra el costo exacto", () => {
    expect(chargeCents(13880, 0)).toBe(13880);
  });

  it("rechaza comisiones negativas o de 100 % o más", () => {
    expect(() => chargeCents(100, -1)).toThrow("Comisión fuera de rango");
    expect(() => chargeCents(100, 10_000)).toThrow("Comisión fuera de rango");
  });
});

describe("quoteRates", () => {
  const RATES = [
    rate("International Priority", 3000, 26430),
    rate("International Economy", 2000, 17960),
    rate("International Economy", 3000, 22740),
    rate("International Economy", 5000, 33700),
    rate("International Priority", 5000, 39350),
  ];

  it("elige por servicio el tramo más ajustado que aguanta el peso, del más barato al más caro", () => {
    const options = quoteRates(RATES, 2100, 740);

    expect(options.map(({ service, maxWeightGrams, costCents }) => [service, maxWeightGrams, costCents])).toEqual([
      ["International Economy", 3000, 22740],
      ["International Priority", 3000, 26430],
    ]);
    expect(options[0]?.chargeCents).toBe(chargeCents(22740, 740));
  });

  it("un peso justo en el límite usa ese tramo", () => {
    expect(quoteRates(RATES, 2000, 740)[0]?.maxWeightGrams).toBe(2000);
  });

  it("separa el mismo servicio de distintos transportistas", () => {
    const options = quoteRates([...RATES, { ...rate("International Economy", 5000, 20000), carrier: "OTHER" }], 2100, 0);

    expect(options.map(({ carrier }) => carrier)).toEqual(["OTHER", "FEDEX", "FEDEX"]);
  });

  it("devuelve vacío si el paquete pasa del tramo más alto", () => {
    expect(quoteRates(RATES, 5001, 740)).toEqual([]);
  });

  it("desempata por nombre de servicio cuando cobran lo mismo", () => {
    const options = quoteRates([rate("B", 1000, 100), rate("A", 1000, 100)], 500, 0);

    expect(options.map(({ service }) => service)).toEqual(["A", "B"]);
  });
});
