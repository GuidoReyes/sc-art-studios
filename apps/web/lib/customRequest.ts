// Formulario de encargo (PRD F4): validación en el navegador y envío a POST /api/custom-requests.
// Los límites son los de apps/api/src/routes/customRequests.ts (columnas de CustomRequest); la API
// vuelve a validar todo, así que esto solo evita viajes inútiles y da mensajes por campo.
import type { CustomRequestCreatedResponse } from "@sc-art-studio/shared";
import { z } from "zod";
import { isCountryCode } from "./countries";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
// Más que el cotizador: la API re-codifica la foto con sharp y la sube a R2 antes de responder.
const REQUEST_TIMEOUT_MS = 30_000;
const DESIRED_DATE_MAX_YEARS = 2;

export const REFERENCE_MAX_BYTES = 8 * 1024 * 1024; // igual que REFERENCE_MAX_BYTES de la API
export const REFERENCE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SIZE_OPTIONS = ["small", "medium", "large"] as const;
export const USE_OPTIONS = ["wall", "costume", "gift", "other"] as const;

export type CustomRequestField =
  | "name"
  | "email"
  | "whatsapp"
  | "country"
  | "idea"
  | "colors"
  | "size"
  | "use"
  | "desiredDate";

export type CustomRequestValues = Record<CustomRequestField, string>;

export const EMPTY_VALUES: CustomRequestValues = {
  name: "",
  email: "",
  whatsapp: "",
  country: "",
  idea: "",
  colors: "",
  size: "",
  use: "",
  desiredDate: "",
};

/** "YYYY-MM-DD" del día en UTC, como compara la API. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Último día aceptado para la fecha deseada (hoy + 2 años, en UTC). */
export function latestDesiredDay(today: Date): string {
  const latest = new Date(Date.UTC(today.getUTCFullYear() + DESIRED_DATE_MAX_YEARS, today.getUTCMonth(), today.getUTCDate()));
  return isoDay(latest);
}

const optional = <T extends z.ZodType>(schema: T) => z.union([z.literal(""), schema]);

function createSchema(today: Date) {
  const first = isoDay(today);
  const last = latestDesiredDay(today);
  return z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().pipe(z.email().max(254)),
    whatsapp: optional(z.string().trim().regex(/^\+?[\d\s().-]{8,32}$/)),
    country: z.string().refine(isCountryCode),
    idea: z.string().trim().min(10).max(2000),
    colors: z.string().trim().max(300),
    size: optional(z.enum(SIZE_OPTIONS)),
    use: optional(z.enum(USE_OPTIONS)),
    // Las cadenas ISO se comparan bien como texto; z.iso.date() descarta "2026-02-30".
    desiredDate: optional(z.iso.date().refine((day) => day >= first && day <= last)),
  });
}

export type ValidationResult =
  | { ok: true; values: CustomRequestValues }
  | { ok: false; invalid: CustomRequestField[] };

export function validateCustomRequest(values: CustomRequestValues, today: Date = new Date()): ValidationResult {
  const result = createSchema(today).safeParse(values);
  if (result.success) return { ok: true, values: result.data };
  const invalid = [...new Set(result.error.issues.map((issue) => issue.path[0] as CustomRequestField))];
  return { ok: false, invalid };
}

export type ReferenceProblem = "type" | "size";

/** Revisión rápida en el navegador; la API detecta el formato real por el contenido. */
export function checkReference(file: Pick<File, "type" | "size">): ReferenceProblem | null {
  if (!(REFERENCE_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size > REFERENCE_MAX_BYTES) return "size";
  return null;
}

export type SubmitResult =
  | { kind: "created"; id: string }
  /** 400: la API rechazó algún campo que el navegador dejó pasar. */
  | { kind: "invalid" }
  /** 403: Turnstile no validó el token. */
  | { kind: "notHuman" }
  | { kind: "tooLarge" }
  | { kind: "unsupported" }
  | { kind: "rateLimited" }
  /** 503: Turnstile o el almacenamiento de fotos no responden. */
  | { kind: "unavailable" }
  | { kind: "failed" };

const STATUS_RESULT: Record<number, SubmitResult> = {
  400: { kind: "invalid" },
  403: { kind: "notHuman" },
  413: { kind: "tooLarge" },
  415: { kind: "unsupported" },
  429: { kind: "rateLimited" },
  503: { kind: "unavailable" },
};

/** Arma el multipart que espera la API: campos vacíos fuera y la foto en el campo `reference`. */
export function buildFormData(values: CustomRequestValues, reference: File | null, turnstileToken: string): FormData {
  const form = new FormData();
  for (const [field, value] of Object.entries(values)) {
    const trimmed = value.trim();
    if (trimmed) form.append(field, trimmed);
  }
  form.append("turnstileToken", turnstileToken);
  if (reference) form.append("reference", reference);
  return form;
}

export async function submitCustomRequest(
  values: CustomRequestValues,
  reference: File | null,
  turnstileToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  try {
    // Sin Content-Type a mano: el navegador pone el boundary del multipart.
    const res = await fetchImpl(`${API_URL}/api/custom-requests`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: buildFormData(values, reference, turnstileToken),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 201) {
      const { id } = (await res.json()) as CustomRequestCreatedResponse;
      return { kind: "created", id };
    }
    return STATUS_RESULT[res.status] ?? { kind: "failed" };
  } catch {
    // Sin red, timeout o CORS: mensaje para reintentar, no un error técnico.
    return { kind: "failed" };
  }
}
