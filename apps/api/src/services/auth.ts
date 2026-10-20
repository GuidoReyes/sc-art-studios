// Login, refresh rotativo y logout del admin (capa 1). Sin Express: la ruta solo traduce a HTTP.
import { randomBytes } from "node:crypto";
import { LOGIN_LOCK_MS, LOGIN_MAX_FAILURES, REFRESH_TOKEN_TTL_MS } from "../config.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import type { TokenService } from "../lib/tokens.js";
import type { AdminIdentity, AdminRepository } from "../repositories/admins.js";

export interface IssuedSession {
  user: AdminIdentity;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  csrfToken: string;
}

export type LoginResult = { status: "ok"; session: IssuedSession } | { status: "invalid" } | { status: "locked" };
export type RefreshResult = { status: "ok"; session: IssuedSession } | { status: "invalid" };

export interface AuthService {
  login(email: string, password: string, ip?: string): Promise<LoginResult>;
  refresh(refreshToken: string, ip?: string): Promise<RefreshResult>;
  /** Revoca la familia del token si existe; sin token no hace nada. */
  logout(refreshToken: string | undefined, ip?: string): Promise<void>;
}

export interface AuthServiceDeps {
  repository: AdminRepository;
  tokens: TokenService;
  verify?: (hash: string, plain: string) => Promise<boolean>;
  now?: () => Date;
}

// 32 caracteres hex: cabe en AdminSession.familyId.
const newFamilyId = () => randomBytes(16).toString("hex");

// Con un correo que no existe también se corre argon2, contra un hash de relleno: así el tiempo
// de respuesta no revela qué correos son de un admin.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

export function createAuthService({
  repository,
  tokens,
  verify = verifyPassword,
  now = () => new Date(),
}: AuthServiceDeps): AuthService {
  function buildSession(user: AdminIdentity, familyId: string, refreshExpiresAt: Date) {
    const refreshToken = tokens.newRefreshToken();
    const session: IssuedSession = {
      user,
      accessToken: tokens.signAccess({ sub: user.id, role: user.role, sid: familyId }),
      refreshToken,
      refreshExpiresAt,
      csrfToken: tokens.csrfToken(familyId),
    };
    const stored = { userId: user.id, familyId, tokenHash: tokens.hashRefreshToken(refreshToken), expiresAt: refreshExpiresAt };
    return { session, stored };
  }

  async function registerFailure(userId: string, ip: string | undefined, at: Date): Promise<LoginResult> {
    await repository.audit({ action: "auth.login_failed", userId, ip });
    const failures = await repository.addFailure(userId);
    if (failures < LOGIN_MAX_FAILURES) return { status: "invalid" };
    await repository.lock(userId, new Date(at.getTime() + LOGIN_LOCK_MS));
    await repository.audit({ action: "auth.locked", userId, ip });
    return { status: "locked" };
  }

  return {
    async login(email, password, ip) {
      const at = now();
      const admin = await repository.findByEmail(email);
      if (!admin) {
        await verify(await getDummyHash(), password);
        return { status: "invalid" };
      }
      // Bloqueada: ni se prueba la contraseña, para que adivinar no avance mientras dure.
      if (admin.lockedUntil && admin.lockedUntil > at) return { status: "locked" };
      if (!(await verify(admin.passwordHash, password))) return registerFailure(admin.id, ip, at);

      const user = { id: admin.id, email: admin.email, role: admin.role };
      const { session, stored } = buildSession(user, newFamilyId(), new Date(at.getTime() + REFRESH_TOKEN_TTL_MS));
      await repository.createSession(stored);
      await repository.recordLogin(user.id, at);
      await repository.audit({ action: "auth.login", userId: user.id, ip });
      return { status: "ok", session };
    },

    async refresh(refreshToken, ip) {
      const at = now();
      const current = await repository.findSession(tokens.hashRefreshToken(refreshToken));
      if (!current || current.revokedAt || current.expiresAt <= at) return { status: "invalid" };

      const { session, stored } = buildSession(current.user, current.familyId, current.expiresAt);
      // Un token ya usado que vuelve a llegar fue copiado: se cierra la sesión entera.
      const rotated = !current.usedAt && (await repository.rotateSession(current.id, stored, at));
      if (!rotated) {
        await repository.revokeFamily(current.familyId, at);
        await repository.audit({ action: "auth.refresh_reuse", userId: current.user.id, ip });
        return { status: "invalid" };
      }
      return { status: "ok", session };
    },

    async logout(refreshToken, ip) {
      if (!refreshToken) return;
      const current = await repository.findSession(tokens.hashRefreshToken(refreshToken));
      if (!current) return;
      await repository.revokeFamily(current.familyId, now());
      await repository.audit({ action: "auth.logout", userId: current.user.id, ip });
    },
  };
}
