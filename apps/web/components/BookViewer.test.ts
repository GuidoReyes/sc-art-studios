import { describe, expect, it } from "vitest";
import { visiblePages } from "./BookViewer";

describe("visiblePages", () => {
  it("en dos páginas: portada sola, luego pares de páginas, contraportada sola", () => {
    // 12 páginas → 6 hojas
    expect(visiblePages(0, 12, false)).toEqual([0]);
    expect(visiblePages(1, 12, false)).toEqual([1, 2]);
    expect(visiblePages(5, 12, false)).toEqual([9, 10]);
    expect(visiblePages(6, 12, false)).toEqual([11]);
  });

  it("en el móvil, una página por vez", () => {
    expect(visiblePages(0, 12, true)).toEqual([0]);
    expect(visiblePages(7, 12, true)).toEqual([7]);
  });

  it("con un número impar de páginas la última hoja no tiene reverso", () => {
    expect(visiblePages(3, 5, false)).toEqual([]);
    expect(visiblePages(2, 5, false)).toEqual([3, 4]);
  });
});
