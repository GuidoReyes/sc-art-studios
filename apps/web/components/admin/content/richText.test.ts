import { describe, expect, it } from "vitest";
import { wrapSelection } from "./richText";

describe("wrapSelection", () => {
  it("envuelve la selección", () => {
    expect(wrapSelection("hola mundo", 5, 10, "<strong>", "</strong>")).toBe("hola <strong>mundo</strong>");
  });
  it("sin selección inserta en el cursor y tolera rangos invertidos", () => {
    expect(wrapSelection("ab", 1, 1, "<em>", "</em>")).toBe("a<em></em>b");
    expect(wrapSelection("abc", 3, 1, "[", "]")).toBe("a[bc]");
  });
});
