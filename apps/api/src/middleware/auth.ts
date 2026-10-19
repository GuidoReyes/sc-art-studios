import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../lib/env.js";

// Un solo algoritmo permitido: evita ataques de confusión de algoritmo (`none`, HS512, RS256 con la clave como pública).
const JWT_ALGORITHM = "HS256" as const;

const ClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["OWNER", "EDITOR"]),
});

export type Role = z.infer<typeof ClaimsSchema>["role"];
type Claims = z.infer<typeof ClaimsSchema>;

// Capa 1: JWT corto en cookie httpOnly. El refresh rotativo vive en su propia ruta.
export function signAccess(claims: Claims) {
  return jwt.sign(claims, env.JWT_SECRET, { algorithm: JWT_ALGORITHM, expiresIn: "15m" });
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.access;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    let claims: Claims;
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
      // Firma válida no basta: la forma del payload también se valida.
      claims = ClaimsSchema.parse(payload);
    } catch {
      return res.status(401).json({ error: "Sesión vencida" });
    }
    if (!roles.includes(claims.role)) return res.status(403).json({ error: "Sin permiso" });
    (req as Request & { user?: Claims }).user = claims;
    next();
  };
}

export const accessCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 15 * 60_000,
};
