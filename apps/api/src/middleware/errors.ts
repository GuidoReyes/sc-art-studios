import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import pino from "pino";

export const logger = pino({ redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"] });

// Capa 8: errores sin filtrar detalles internos al cliente.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(400).json({ error: "Datos inválidos", issues: err.issues });
  logger.error({ err }, "error no controlado");
  return res.status(500).json({ error: "Error interno" });
}
