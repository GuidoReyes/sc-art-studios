// Solo para pruebas: AdminRepository en memoria, con el mismo comportamiento que el de Prisma.
import type { AdminCredentials, AdminRepository, AuditEntry, NewSession } from "../repositories/admins.js";

interface MemoryUser extends AdminCredentials {
  failedLogins: number;
  lastLoginAt: Date | null;
}

interface MemorySession extends NewSession {
  id: string;
  usedAt: Date | null;
  revokedAt: Date | null;
}

/** Hash falso y rápido para no correr argon2 en cada prueba. */
export const fakeHash = (plain: string) => `hash:${plain}`;
export const fakeVerify = async (hash: string, plain: string) => hash === fakeHash(plain);

export function createMemoryAdminRepository(seed: readonly AdminCredentials[] = []) {
  const users = new Map<string, MemoryUser>(seed.map((user) => [user.id, { ...user, failedLogins: 0, lastLoginAt: null }]));
  const sessions: MemorySession[] = [];
  const audits: AuditEntry[] = [];
  let nextId = 0;

  const userOf = (id: string) => {
    const user = users.get(id);
    if (!user) throw new Error(`No existe el admin ${id}`);
    return user;
  };
  const addSession = (session: NewSession) =>
    sessions.push({ ...session, id: `s${(nextId += 1)}`, usedAt: null, revokedAt: null });

  const repository: AdminRepository = {
    async findByEmail(email) {
      const user = [...users.values()].find((candidate) => candidate.email === email);
      return user ? { id: user.id, email: user.email, role: user.role, passwordHash: user.passwordHash, lockedUntil: user.lockedUntil } : null;
    },
    async addFailure(userId) {
      const user = userOf(userId);
      user.failedLogins += 1;
      return user.failedLogins;
    },
    async lock(userId, until) {
      Object.assign(userOf(userId), { lockedUntil: until, failedLogins: 0 });
    },
    async recordLogin(userId, at) {
      Object.assign(userOf(userId), { failedLogins: 0, lockedUntil: null, lastLoginAt: at });
    },
    async createSession(session) {
      addSession(session);
    },
    async findSession(tokenHash) {
      const session = sessions.find((candidate) => candidate.tokenHash === tokenHash);
      if (!session) return null;
      const { id, email, role } = userOf(session.userId);
      return { ...session, user: { id, email, role } };
    },
    async rotateSession(usedId, next, at) {
      const session = sessions.find((candidate) => candidate.id === usedId);
      if (!session || session.usedAt) return false;
      session.usedAt = at;
      addSession(next);
      return true;
    },
    async revokeFamily(familyId, at) {
      for (const session of sessions) if (session.familyId === familyId && !session.revokedAt) session.revokedAt = at;
    },
    async audit(entry) {
      audits.push(entry);
    },
    async createAdmin({ email, passwordHash, role }) {
      const id = `u${(nextId += 1)}`;
      users.set(id, { id, email, role, passwordHash, lockedUntil: null, failedLogins: 0, lastLoginAt: null });
      return { id, email, role };
    },
  };

  return { repository, users, sessions, audits };
}
