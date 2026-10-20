// Tokens de la sesión del admin (capa 1): JWT de acceso, refresh opaco y token CSRF.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ACCESS_TOKEN_TTL_MS } from "../config.js";

// Un solo algoritmo permitido: evita ataques de confusión de algoritmo (`none`, HS512, RS256 con la clave como pública).
const JWT_ALGORITHM = "HS256" as const;
const REFRESH_TOKEN_BYTES = 32;

const ClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["OWNER", "EDITOR"]),
  /** Familia de la sesión (un login): ata el CSRF y permite revocar. */
  sid: z.string().min(1),
});

export type Role = z.infer<typeof ClaimsSchema>["role"];
export type AccessClaims = z.infer<typeof ClaimsSchema>;

export interface TokenSecrets {
  accessSecret: string;
  refreshSecret: string;
}

export interface TokenService {
  signAccess(claims: AccessClaims): string;
  /** null si la firma, el algoritmo, la fecha o la forma del payload no sirven. */
  verifyAccess(token: string): AccessClaims | null;
  newRefreshToken(): string;
  /** Lo que se guarda en la base: con la clave del servidor, una filtración de la tabla no sirve. */
  hashRefreshToken(token: string): string;
  csrfToken(sessionId: string): string;
  isValidCsrf(sessionId: string, candidate: unknown): boolean;
}

const hmac = (secret: string, value: string) => createHmac("sha256", secret).update(value);

export function createTokenService({ accessSecret, refreshSecret }: TokenSecrets): TokenService {
  const csrfToken = (sessionId: string) => hmac(accessSecret, `csrf:${sessionId}`).digest("base64url");

  return {
    signAccess: ({ sub, role, sid }) =>
      jwt.sign({ sub, role, sid }, accessSecret, {
        algorithm: JWT_ALGORITHM,
        expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      }),

    verifyAccess(token) {
      try {
        const payload = jwt.verify(token, accessSecret, { algorithms: [JWT_ALGORITHM] });
        // Firma válida no basta: la forma del payload también se valida.
        const result = ClaimsSchema.safeParse(payload);
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    },

    newRefreshToken: () => randomBytes(REFRESH_TOKEN_BYTES).toString("base64url"),

    hashRefreshToken: (token) => hmac(refreshSecret, token).digest("hex"),

    csrfToken,

    // Comparación en tiempo constante: no deja adivinar el token carácter por carácter.
    isValidCsrf(sessionId, candidate) {
      if (typeof candidate !== "string") return false;
      const expected = Buffer.from(csrfToken(sessionId));
      const received = Buffer.from(candidate);
      return expected.length === received.length && timingSafeEqual(expected, received);
    },
  };
}
