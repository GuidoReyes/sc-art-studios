import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password (argon2id)", () => {
  it("genera un hash argon2id que no contiene la contraseña", async () => {
    const hash = await hashPassword("Correcta-123");

    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("Correcta-123");
  });

  it("verifica la contraseña correcta y rechaza una incorrecta", async () => {
    const hash = await hashPassword("Correcta-123");

    expect(await verifyPassword(hash, "Correcta-123")).toBe(true);
    expect(await verifyPassword(hash, "incorrecta")).toBe(false);
  });
});
