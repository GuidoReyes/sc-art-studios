import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createPrismaAdminRepository } from "./admins.js";

const AT = new Date("2026-10-20T12:00:00.000Z");
const SESSION = { userId: "u1", familyId: "f".repeat(32), tokenHash: "h".repeat(64), expiresAt: AT };

function fakePrisma() {
  const tx = {
    adminSession: { updateMany: vi.fn(async () => ({ count: 1 })), create: vi.fn(async () => ({})) },
  };
  const prisma = {
    adminUser: {
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({ failedLogins: 3 })),
      create: vi.fn(async () => ({ id: "u1", email: "a@example.com", role: "OWNER" })),
    },
    adminSession: {
      create: vi.fn(async () => ({})),
      findUnique: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 2 })),
    },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, tx, repository: createPrismaAdminRepository(prisma as unknown as PrismaClient) };
}

describe("createPrismaAdminRepository", () => {
  it("busca por correo leyendo el hash solo para verificar", async () => {
    const { prisma, repository } = fakePrisma();

    await repository.findByEmail("a@example.com");

    expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
      where: { email: "a@example.com" },
      select: { id: true, email: true, role: true, passwordHash: true, lockedUntil: true },
    });
  });

  it("suma fallos de forma atómica y devuelve el total", async () => {
    const { prisma, repository } = fakePrisma();

    expect(await repository.addFailure("u1")).toBe(3);
    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedLogins: { increment: 1 } },
      select: { failedLogins: true },
    });
  });

  it("bloquear reinicia el contador; un login lo limpia y registra la fecha", async () => {
    const { prisma, repository } = fakePrisma();

    await repository.lock("u1", AT);
    await repository.recordLogin("u1", AT);

    expect(prisma.adminUser.update).toHaveBeenNthCalledWith(1, { where: { id: "u1" }, data: { lockedUntil: AT, failedLogins: 0 } });
    expect(prisma.adminUser.update).toHaveBeenNthCalledWith(2, {
      where: { id: "u1" },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: AT },
    });
  });

  it("crea y busca sesiones por el hash del token", async () => {
    const { prisma, repository } = fakePrisma();

    await repository.createSession(SESSION);
    await repository.findSession(SESSION.tokenHash);

    expect(prisma.adminSession.create).toHaveBeenCalledWith({ data: SESSION });
    expect(prisma.adminSession.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: SESSION.tokenHash } }),
    );
  });

  it("rota solo si el token no estaba usado, en una transacción", async () => {
    const { tx, repository } = fakePrisma();

    expect(await repository.rotateSession("s1", SESSION, AT)).toBe(true);
    expect(tx.adminSession.updateMany).toHaveBeenCalledWith({ where: { id: "s1", usedAt: null }, data: { usedAt: AT } });
    expect(tx.adminSession.create).toHaveBeenCalledWith({ data: SESSION });
  });

  it("si otro pedido ya lo usó no crea el siguiente", async () => {
    const { tx, repository } = fakePrisma();
    tx.adminSession.updateMany.mockResolvedValueOnce({ count: 0 });

    expect(await repository.rotateSession("s1", SESSION, AT)).toBe(false);
    expect(tx.adminSession.create).not.toHaveBeenCalled();
  });

  it("revoca solo las sesiones aún vivas de la familia", async () => {
    const { prisma, repository } = fakePrisma();

    await repository.revokeFamily("fam", AT);

    expect(prisma.adminSession.updateMany).toHaveBeenCalledWith({ where: { familyId: "fam", revokedAt: null }, data: { revokedAt: AT } });
  });

  it("audita sobre la entidad AdminUser", async () => {
    const { prisma, repository } = fakePrisma();

    await repository.audit({ action: "auth.login", userId: "u1", ip: "203.0.113.5" });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: { action: "auth.login", entity: "AdminUser", entityId: "u1", userId: "u1", ip: "203.0.113.5" },
    });
  });

  it("crea un admin devolviendo solo su identidad", async () => {
    const { prisma, repository } = fakePrisma();

    await repository.createAdmin({ email: "a@example.com", passwordHash: "$argon2id$x", role: "OWNER" });

    expect(prisma.adminUser.create).toHaveBeenCalledWith({
      data: { email: "a@example.com", passwordHash: "$argon2id$x", role: "OWNER" },
      select: { id: true, email: true, role: true },
    });
  });
});
