/**
 * Error esperado con su código HTTP: el manejador de errores muestra su mensaje tal cual,
 * así que el mensaje nunca debe llevar datos internos.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Código estable para que el admin reaccione sin depender del texto. */
    readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
