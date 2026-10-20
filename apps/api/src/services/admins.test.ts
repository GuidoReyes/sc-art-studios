import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { createMemoryAdminRepository, fakeHash } from "../testing/memoryAdmins.js";
import { AdminExistsError, createAdmin } from "./admins.js";

const hash = async (plain: string) => fakeHash(plain);

describe("createAdmin", () => {
  it("normaliza el correo, guarda solo el hash y devuelve la identidad", async () => {
    const { repository, users } = createMemoryAdminRepository();

    const admin = await createAdmin(repository, { email: "  Duena@Example.com ", password: "una-contraseña-larga", role: "OWNER" }, hash);

    expect(admin).toEqual({ id: expect.any(String), email: "duena@example.com", role: "OWNER" });
    expect(users.get(admin.id)?.passwordHash).toBe(fakeHash("una-contraseña-larga"));
  });

  it("usa argon2id por defecto", async () => {
    const { repository, users } = createMemoryAdminRepository();

    const admin = await createAdmin(repository, { email: "a@example.com", password: "una-contraseña-larga", role: "EDITOR" });

    expect(users.get(admin.id)?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("no pisa una cuenta existente", async () => {
    const { repository } = createMemoryAdminRepository();
    await createAdmin(repository, { email: "a@example.com", password: "una-contraseña-larga", role: "OWNER" }, hash);

    await expect(
      createAdmin(repository, { email: "A@example.com", password: "otra-contraseña-larga", role: "OWNER" }, hash),
    ).rejects.toBeInstanceOf(AdminExistsError);
  });

  it.each([
    ["contraseña corta", { email: "a@example.com", password: "corta", role: "OWNER" }],
    ["correo inválido", { email: "no-es-correo", password: "una-contraseña-larga", role: "OWNER" }],
    ["rol inexistente", { email: "a@example.com", password: "una-contraseña-larga", role: "ADMIN" }],
  ] as const)("rechaza %s", async (_name, input) => {
    const { repository } = createMemoryAdminRepository();

    await expect(createAdmin(repository, input as never, hash)).rejects.toBeInstanceOf(ZodError);
  });
});
