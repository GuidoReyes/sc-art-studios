// /api/auth (capa 1): login, refresh rotativo, logout y sesión actual del admin.
import { type CookieOptions, type Request, type Response, Router } from "express";
import { z } from "zod";
import type { AdminSessionResponse } from "@sc-art-studio/shared";
import { LOGIN_RATE_LIMIT, PASSWORD_MAX_LENGTH, type RateLimitConfig } from "../config.js";
import type { TokenService } from "../lib/tokens.js";
import { ACCESS_COOKIE, accessCookieOptions, requireAdmin } from "../middleware/auth.js";
import { createLimiter } from "../middleware/security.js";
import type { AuthService, IssuedSession } from "../services/auth.js";

export interface AuthDeps {
  service: AuthService;
  tokens: TokenService;
  loginRateLimit?: RateLimitConfig;
}

// `__Secure-` y solo en /api/auth: el refresh no viaja con cada pedido a la API.
// Strict: la web y la API son el mismo sitio (scartstudios.com), así que no hace falta Lax.
export const REFRESH_COOKIE = "__Secure-sc_refresh";
const REFRESH_COOKIE_PATH = "/api/auth";
const refreshCookieOptions: CookieOptions = { httpOnly: true, secure: true, sameSite: "strict", path: REFRESH_COOKIE_PATH };

const MESSAGES = {
  invalid: "Correo o contraseña incorrectos",
  locked: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.",
  expired: "Sesión vencida",
} as const;

const LoginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    // Sin mínimo aquí: una contraseña corta simplemente no coincide. El tope evita gastar argon2 en megas.
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  })
  .strict();

function startSession(res: Response, session: IssuedSession): void {
  res.cookie(ACCESS_COOKIE, session.accessToken, accessCookieOptions);
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...refreshCookieOptions, expires: session.refreshExpiresAt });
  const body: AdminSessionResponse = {
    data: { user: { id: session.user.id, role: session.user.role }, csrfToken: session.csrfToken },
  };
  res.json(body);
}

function endSession(res: Response): void {
  const { maxAge: _maxAge, ...accessPath } = accessCookieOptions;
  res.clearCookie(ACCESS_COOKIE, accessPath);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
}

const refreshTokenOf = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value !== "" ? value : undefined;
};

export function createAuthRouter({ service, tokens, loginRateLimit = LOGIN_RATE_LIMIT }: AuthDeps): Router {
  const router = Router();
  // Nada de esto se guarda en caché: lleva cookies de sesión o datos de la sesión.
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // El límite por IP solo cuenta fallos; el bloqueo por cuenta vive en el servicio.
  router.post("/login", createLimiter(loginRateLimit), async (req, res) => {
    const { email, password } = LoginSchema.parse(req.body ?? {});
    const result = await service.login(email, password, req.ip);
    if (result.status === "locked") return void res.status(429).json({ error: MESSAGES.locked });
    if (result.status === "invalid") return void res.status(401).json({ error: MESSAGES.invalid });
    startSession(res, result.session);
  });

  router.post("/refresh", async (req, res) => {
    const token = refreshTokenOf(req);
    const result = token ? await service.refresh(token, req.ip) : { status: "invalid" as const };
    if (result.status === "invalid") {
      endSession(res);
      return void res.status(401).json({ error: MESSAGES.expired });
    }
    startSession(res, result.session);
  });

  // Cerrar sesión no exige CSRF: lo peor que logra otro sitio es sacar al admin.
  router.post("/logout", async (req, res) => {
    await service.logout(refreshTokenOf(req), req.ip);
    endSession(res);
    res.status(204).end();
  });

  // Para que el admin recupere su token CSRF tras recargar la página.
  router.get("/session", requireAdmin(tokens, "OWNER", "EDITOR"), (_req, res) => {
    const admin = res.locals.admin;
    if (!admin) throw new Error("requireAdmin no dejó la sesión en res.locals");
    const body: AdminSessionResponse = {
      data: { user: { id: admin.id, role: admin.role }, csrfToken: tokens.csrfToken(admin.sessionId) },
    };
    res.json(body);
  });

  return router;
}
