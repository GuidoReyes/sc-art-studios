import { describe, expect, it } from "vitest";
import { formatGtq, formatUsd, usdToGtq } from "./price";

describe("formatUsd", () => {
  it("muestra US$ sin centavos cuando el monto es entero", () => {
    expect(formatUsd(95)).toBe("US$95");
  });

  it("muestra dos decimales cuando hay centavos", () => {
    expect(formatUsd(77.3)).toBe("US$77.30");
  });

  it("agrupa los miles con coma", () => {
    expect(formatUsd(1250)).toBe("US$1,250");
  });

  it("rechaza montos negativos o que no son números", () => {
    expect(() => formatUsd(-1)).toThrow(RangeError);
    expect(() => formatUsd(Number.NaN)).toThrow(RangeError);
  });
});

describe("usdToGtq", () => {
  it("convierte con el tipo de cambio recibido y redondea al quetzal", () => {
    // 95 × 7.645 = 726.275 (tipo de cambio de ejemplo; el real viene de CostSettings)
    expect(usdToGtq(95, 7.645)).toBe(726);
  });

  it("rechaza un tipo de cambio cero o negativo", () => {
    expect(() => usdToGtq(95, 0)).toThrow(RangeError);
    expect(() => usdToGtq(95, -7)).toThrow(RangeError);
  });
});

describe("formatGtq", () => {
  it("muestra Q y el monto entero", () => {
    expect(formatGtq(726)).toBe("Q726");
    expect(formatGtq(7645)).toBe("Q7,645");
  });
});
