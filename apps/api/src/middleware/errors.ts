import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

interface HttpError {
  status?: number;
  statusCode?: number;
}

function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { status, statusCode } = err as HttpError;
  const code = status ?? statusCode;
  return code !== undefined && code >= 400 && code < 500 ? code : undefined;
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "No encontrado" });
}

// Capa 8: errores sin filtrar detalles internos al cliente.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  // Si la respuesta ya empezó, Express debe cortar la conexión.
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Datos inválidos", issues: err.issues });
    return;
  }
  const clientStatus = clientErrorStatus(err);
  if (clientStatus) {
    // JSON malformado, cuerpo demasiado grande, etc.
    res.status(clientStatus).json({ error: "Solicitud inválida" });
    return;
  }
  req.log?.error({ err }, "error no controlado");
  res.status(500).json({ error: "Error interno" });
}
