// POST /api/custom-requests (PRD §4.5, F4): formulario de encargo personalizado.
// Orden pensado para gastar lo menos posible con spam: rate limit → tamaño → Zod → Turnstile → sharp → R2 → DB.
import { randomUUID } from "node:crypto";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";
import type { CustomRequestCreatedResponse } from "@sc-art-studio/shared";
import { FORM_RATE_LIMIT, REFERENCE_MAX_BYTES, type RateLimitConfig } from "../config.js";
import { UnsupportedImageError, processReferenceImage } from "../lib/images.js";
import type { ReferenceStorage } from "../lib/storage.js";
import { TurnstileUnavailableError, type TurnstileVerifier } from "../lib/turnstile.js";
import { createLimiter } from "../middleware/security.js";
import type { CustomRequestRepository } from "../repositories/customRequests.js";

export interface CustomRequestsDeps {
  repository: CustomRequestRepository;
  verifyTurnstile: TurnstileVerifier;
  /** Sin bucket configurado se aceptan encargos, pero no fotos. */
  storage?: ReferenceStorage;
  rateLimit?: RateLimitConfig;
  now?: () => Date;
}

const REFERENCE_FIELD = "reference";
const DESIRED_DATE_MAX_YEARS = 2;
const TURNSTILE_TOKEN_MAX_LENGTH = 2048; // límite documentado por Cloudflare
const countryNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
// Códigos que Intl reconoce pero no son países: uso privado (AA, QM–QZ, XA–XZ salvo XK = Kosovo,
// ZZ = "Unknown Region") y agrupaciones (EU, EZ, UN, QO).
const NOT_A_COUNTRY = /^(AA|Q[M-Z]|X[A-JL-Z]|ZZ|EU|EZ|UN|QO)$/;

function isCountryCode(code: string): boolean {
  if (!/^[A-Z]{2}$/.test(code) || NOT_A_COUNTRY.test(code)) return false;
  return countryNames.of(code) !== undefined;
}

const MESSAGES = {
  notHuman: "No pudimos verificar el formulario. Recarga la página e inténtalo de nuevo.",
  turnstileDown: "No pudimos verificar el formulario en este momento. Inténtalo en unos minutos.",
  noUploads: "Por ahora no podemos recibir fotos. Envía el encargo sin foto o escríbenos por WhatsApp.",
  tooLarge: "La foto pesa más de 8 MB.",
} as const;

/** Error esperado del formulario: su mensaje sí se le muestra a quien llena el encargo. */
class FormError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// En multipart un campo opcional vacío llega como "": se trata como si no viniera.
const blankToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const optionalText = (max: number) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Los límites de largo son los de las columnas de CustomRequest.
function createBodySchema(now: () => Date) {
  const desiredDate = z.iso
    .date()
    .transform((value) => ({ value, date: new Date(`${value}T00:00:00.000Z`) }))
    .refine(({ value, date }) => date.toISOString().startsWith(value), "fecha inexistente")
    .refine(({ date }) => {
      const today = startOfUtcDay(now());
      const latest = new Date(today);
      latest.setUTCFullYear(today.getUTCFullYear() + DESIRED_DATE_MAX_YEARS);
      return date >= today && date <= latest;
    }, `la fecha debe estar entre hoy y ${DESIRED_DATE_MAX_YEARS} años`)
    .transform(({ date }) => date);

  return z
    .object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().pipe(z.email().max(254)),
      whatsapp: z.preprocess(blankToUndefined, z.string().trim().regex(/^\+?[\d\s().-]{8,32}$/).optional()),
      country: z
        .string()
        .trim()
        .toUpperCase()
        // Un solo refine: Zod 4 corre los checks aunque falle uno anterior, e Intl lanza con "USA".
        .refine(isCountryCode, "código de país ISO 3166-1 alfa-2"),
      idea: z.string().trim().min(10).max(2000),
      colors: optionalText(300),
      size: optionalText(100),
      use: optionalText(300),
      desiredDate: z.preprocess(blankToUndefined, desiredDate.optional()),
      turnstileToken: z.string().min(1).max(TURNSTILE_TOKEN_MAX_LENGTH),
    })
    .strict();
}

// multer en memoria: el archivo nunca toca el disco y se corta al pasar el tope.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: REFERENCE_MAX_BYTES, files: 1, fields: 20, fieldSize: 10_000, parts: 25 },
}).single(REFERENCE_FIELD);

const parseUpload: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (!error) return next();
    if (!(error instanceof multer.MulterError)) return next(error);
    if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: MESSAGES.tooLarge });
    // Otro nombre de campo, dos fotos o demasiados campos.
    return res.status(400).json({ error: "Solicitud inválida" });
  });
};

async function assertHuman(verify: TurnstileVerifier, token: string, ip: string | undefined): Promise<void> {
  let isHuman: boolean;
  try {
    isHuman = await verify(token, ip);
  } catch (error) {
    if (error instanceof TurnstileUnavailableError) throw new FormError(503, MESSAGES.turnstileDown);
    throw error;
  }
  if (!isHuman) throw new FormError(403, MESSAGES.notHuman);
}

async function storeReference(file: Express.Multer.File, storage: ReferenceStorage | undefined): Promise<string> {
  if (!storage) throw new FormError(503, MESSAGES.noUploads);
  let image;
  try {
    image = await processReferenceImage(file.buffer);
  } catch (error) {
    if (error instanceof UnsupportedImageError) throw new FormError(415, error.message);
    throw error;
  }
  // Nombre aleatorio: no revela quién la mandó ni el nombre original del archivo.
  const key = `custom-requests/${randomUUID()}.${image.extension}`;
  await storage.put(key, image.data, image.contentType);
  return key;
}

export function createCustomRequestsRouter({
  repository,
  verifyTurnstile,
  storage,
  rateLimit = FORM_RATE_LIMIT,
  now = () => new Date(),
}: CustomRequestsDeps): Router {
  const router = Router();
  const bodySchema = createBodySchema(now);

  router.post("/", createLimiter(rateLimit), parseUpload, async (req, res) => {
    let referenceR2Key: string | undefined;
    try {
      const { turnstileToken, ...fields } = bodySchema.parse(req.body ?? {});
      await assertHuman(verifyTurnstile, turnstileToken, req.ip);
      if (req.file) referenceR2Key = await storeReference(req.file, storage);

      const { id } = await repository.create({ ...fields, referenceR2Key });
      const body: CustomRequestCreatedResponse = { id };
      res.status(201).json(body);
    } catch (error) {
      if (referenceR2Key) await removeOrphan(storage, referenceR2Key, req.log);
      if (error instanceof FormError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error; // ZodError → 400, lo demás → 500 sin detalles (middleware/errors.ts)
    }
  });

  return router;
}

// Si la base falla después de subir la foto, se borra para no dejar datos de un cliente sin encargo.
async function removeOrphan(
  storage: ReferenceStorage | undefined,
  key: string,
  log: { warn: (obj: object, msg: string) => void },
): Promise<void> {
  try {
    await storage?.remove(key);
  } catch {
    log.warn({ key }, "no se pudo borrar la foto de un encargo que no se guardó");
  }
}
