import { describe, expect, it } from "vitest";
import { countByStatus } from "./dashboard.js";

describe("countByStatus", () => {
  it("pone en 0 los estados sin filas y respeta el orden dado", () => {
    // Arrange
    const groups = [
      { status: "SOLD" as const, _count: { _all: 2 } },
      { status: "AVAILABLE" as const, _count: { _all: 5 } },
    ];

    // Act
    const counts = countByStatus(["AVAILABLE", "RESERVED", "SOLD"] as const, groups);

    // Assert
    expect(counts).toEqual({ AVAILABLE: 5, RESERVED: 0, SOLD: 2 });
    expect(Object.keys(counts)).toEqual(["AVAILABLE", "RESERVED", "SOLD"]);
  });

});
