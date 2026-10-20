import type { PrismaClient } from "../generated/prisma/client.js";
import type { Role } from "../lib/tokens.js";

export interface AdminIdentity {
  id: string;
  email: string;
  role: Role;
}

export interface AdminCredentials extends AdminIdentity {
  passwordHash: string;
  lockedUntil: Date | null;
}

export interface NewSession {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface StoredSession {
  id: string;
  familyId: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  user: AdminIdentity;
}

export type AuthAction = "auth.login" | "auth.login_failed" | "auth.locked" | "auth.logout" | "auth.refresh_reuse";

export interface AuditEntry {
  action: AuthAction;
  userId: string;
  ip?: string;
}

export interface AdminRepository {
  findByEmail(email: string): Promise<AdminCredentials | null>;
  /** Suma un fallo y devuelve cuántos lleva seguidos. */
  addFailure(userId: string): Promise<number>;
  lock(userId: string, until: Date): Promise<void>;
  recordLogin(userId: string, at: Date): Promise<void>;
  createSession(session: NewSession): Promise<void>;
  findSession(tokenHash: string): Promise<StoredSession | null>;
  /**
   * Marca el token como usado y crea el siguiente, en una transacción. false si otro pedido
   * ya lo había usado (reuso o carrera): en ese caso no se crea nada.
   */
  rotateSession(usedId: string, next: NewSession, at: Date): Promise<boolean>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
  audit(entry: AuditEntry): Promise<void>;
  createAdmin(admin: { email: string; passwordHash: string; role: Role }): Promise<AdminIdentity>;
}

const IDENTITY_SELECT = { id: true, email: true, role: true } as const;

export function createPrismaAdminRepository(prisma: PrismaClient): AdminRepository {
  return {
    findByEmail: (email) =>
      prisma.adminUser.findUnique({
        where: { email },
        select: { ...IDENTITY_SELECT, passwordHash: true, lockedUntil: true },
      }),

    async addFailure(userId) {
      // `increment` es atómico en la base: dos intentos a la vez no se pisan.
      const { failedLogins } = await prisma.adminUser.update({
        where: { id: userId },
        data: { failedLogins: { increment: 1 } },
        select: { failedLogins: true },
      });
      return failedLogins;
    },

    // Al bloquear, el contador vuelve a cero: tras el bloqueo hay otros 5 intentos.
    async lock(userId, until) {
      await prisma.adminUser.update({ where: { id: userId }, data: { lockedUntil: until, failedLogins: 0 } });
    },

    async recordLogin(userId, at) {
      await prisma.adminUser.update({
        where: { id: userId },
        data: { failedLogins: 0, lockedUntil: null, lastLoginAt: at },
      });
    },

    async createSession(session) {
      await prisma.adminSession.create({ data: session });
    },

    findSession: (tokenHash) =>
      prisma.adminSession.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          familyId: true,
          expiresAt: true,
          usedAt: true,
          revokedAt: true,
          user: { select: IDENTITY_SELECT },
        },
      }),

    rotateSession: (usedId, next, at) =>
      prisma.$transaction(async (tx) => {
        // Condicional: solo uno de dos pedidos simultáneos con el mismo token gana.
        const { count } = await tx.adminSession.updateMany({ where: { id: usedId, usedAt: null }, data: { usedAt: at } });
        if (count !== 1) return false;
        await tx.adminSession.create({ data: next });
        return true;
      }),

    async revokeFamily(familyId, at) {
      await prisma.adminSession.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: at } });
    },

    async audit({ action, userId, ip }) {
      await prisma.auditLog.create({ data: { action, entity: "AdminUser", entityId: userId, userId, ip } });
    },

    createAdmin: (admin) => prisma.adminUser.create({ data: admin, select: IDENTITY_SELECT }),
  };
}
