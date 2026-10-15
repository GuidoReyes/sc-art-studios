import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";

export type Role = "OWNER" | "EDITOR";
interface Claims { sub: string; role: Role }

// Capa 1: JWT corto en cookie httpOnly. El refresh rotativo vive en su propia ruta.
export function signAccess(claims: Claims) {
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: "15m" });
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.access;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    try {
      const claims = jwt.verify(token, env.JWT_SECRET) as Claims;
      if (!roles.includes(claims.role)) return res.status(403).json({ error: "Sin permiso" });
      (req as Request & { user?: Claims }).user = claims;
      next();
    } catch {
      return res.status(401).json({ error: "Sesión vencida" });
    }
  };
}

export const accessCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 15 * 60_000,
};
