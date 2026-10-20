import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from "express";
import { ACCESS_TOKEN_TTL_MS } from "../config.js";
import type { Role, TokenService } from "../lib/tokens.js";

export interface AdminPrincipal {
  id: string;
  role: Role;
  sessionId: string;
}

// Así se tipa res.locals en Express: el namespace global es la vía que ofrecen sus tipos.
declare global {
  namespace Express {
    interface Locals {
      admin?: AdminPrincipal;
    }
  }
}

// `__Host-`: el navegador exige Secure, Path=/ y sin Domain, así que un subdominio no puede plantarla.
export const ACCESS_COOKIE = "__Host-sc_access";
export const CSRF_HEADER = "x-csrf-token";

// Capa 1: JWT corto en cookie httpOnly; JavaScript de la página nunca lo ve.
export const accessCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: ACCESS_TOKEN_TTL_MS,
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Exige sesión de admin con alguno de los roles. En métodos que cambian algo exige además
 * la cabecera X-CSRF-Token, atada a la sesión: otro sitio no puede leerla ni adivinarla.
 */
export function requireAdmin(tokens: TokenService, ...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.[ACCESS_COOKIE];
    if (typeof token !== "string") return void res.status(401).json({ error: "No autenticado" });
    const claims = tokens.verifyAccess(token);
    if (!claims) return void res.status(401).json({ error: "Sesión vencida" });
    if (!roles.includes(claims.role)) return void res.status(403).json({ error: "Sin permiso" });
    if (!SAFE_METHODS.has(req.method) && !tokens.isValidCsrf(claims.sid, req.get(CSRF_HEADER))) {
      return void res.status(403).json({ error: "Token CSRF inválido" });
    }
    res.locals.admin = { id: claims.sub, role: claims.role, sessionId: claims.sid };
    next();
  };
}
