import { describe, expect, it, vi } from "vitest";
import { countryOptions, isCountryCode } from "./countries";
import {
  EMPTY_VALUES,
  REFERENCE_MAX_BYTES,
  buildFormData,
  checkReference,
  latestDesiredDay,
  submitCustomRequest,
  validateCustomRequest,
} from "./customRequest";

const TODAY = new Date("2026-10-26T15:00:00Z");
const VALID = {
  ...EMPTY_VALUES,
  name: "Ana Pérez",
  email: "ana@example.com",
  country: "US",
  idea: "Un zorro naranja con flores en las orejas",
};

describe("validateCustomRequest", () => {
  it("acepta lo mínimo: nombre, correo, país e idea", () => {
    expect(validateCustomRequest(VALID, TODAY)).toEqual({ ok: true, values: VALID });
  });

  it("acepta todos los campos opcionales con valores válidos", () => {
    const full = { ...VALID, whatsapp: "+1 (555) 010-2030", colors: "naranja", size: "large", use: "gift", desiredDate: "2027-01-15" };
    expect(validateCustomRequest(full, TODAY).ok).toBe(true);
  });

  it("marca cada campo inválido una sola vez", () => {
    const result = validateCustomRequest({ ...EMPTY_VALUES, email: "no-es-correo", whatsapp: "12" }, TODAY);
    expect(result).toEqual({ ok: false, invalid: ["name", "email", "whatsapp", "country", "idea"] });
  });

  it("rechaza países que la API no acepta", () => {
    for (const country of ["USA", "us", "EU", "ZZ"]) {
      expect(validateCustomRequest({ ...VALID, country }, TODAY)).toEqual({ ok: false, invalid: ["country"] });
    }
  });

  it("rechaza tamaños y usos fuera de la lista", () => {
    expect(validateCustomRequest({ ...VALID, size: "gigante", use: "x" }, TODAY)).toEqual({ ok: false, invalid: ["size", "use"] });
  });

  it("acepta la fecha deseada entre hoy y dos años, en UTC", () => {
    expect(validateCustomRequest({ ...VALID, desiredDate: "2026-10-26" }, TODAY).ok).toBe(true);
    expect(validateCustomRequest({ ...VALID, desiredDate: latestDesiredDay(TODAY) }, TODAY).ok).toBe(true);
    for (const desiredDate of ["2026-10-25", "2028-10-27", "2027-02-30"]) {
      expect(validateCustomRequest({ ...VALID, desiredDate }, TODAY)).toEqual({ ok: false, invalid: ["desiredDate"] });
    }
  });

  it("recorta espacios como la API", () => {
    const result = validateCustomRequest({ ...VALID, name: "  Ana  " }, TODAY);
    expect(result.ok && result.values.name).toBe("Ana");
  });
});

describe("latestDesiredDay", () => {
  it("suma dos años al día UTC", () => {
    expect(latestDesiredDay(TODAY)).toBe("2028-10-26");
  });
});

describe("checkReference", () => {
  it("acepta jpeg, png y webp hasta 8 MB", () => {
    expect(checkReference({ type: "image/jpeg", size: REFERENCE_MAX_BYTES })).toBeNull();
    expect(checkReference({ type: "image/webp", size: 10 })).toBeNull();
  });

  it("rechaza otros formatos y fotos de más de 8 MB", () => {
    expect(checkReference({ type: "image/heic", size: 10 })).toBe("type");
    expect(checkReference({ type: "image/png", size: REFERENCE_MAX_BYTES + 1 })).toBe("size");
  });
});

describe("buildFormData", () => {
  it("omite los campos vacíos y pone la foto en `reference`", () => {
    const photo = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    const form = buildFormData({ ...VALID, colors: "   " }, photo, "token-1");
    expect([...form.keys()]).toEqual(["name", "email", "country", "idea", "turnstileToken", "reference"]);
    expect(form.get("turnstileToken")).toBe("token-1");
    expect(form.get("reference")).toBeInstanceOf(File);
  });
});

describe("submitCustomRequest", () => {
  const respond = (status: number, body: unknown = {}) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("devuelve el id cuando la API crea el encargo", async () => {
    const fetchImpl = respond(201, { id: "req_1" });
    await expect(submitCustomRequest(VALID, null, "t", fetchImpl)).resolves.toEqual({ kind: "created", id: "req_1" });
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/custom-requests$/);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it.each([
    [400, "invalid"],
    [403, "notHuman"],
    [413, "tooLarge"],
    [415, "unsupported"],
    [429, "rateLimited"],
    [503, "unavailable"],
    [500, "failed"],
  ])("traduce %i a %s", async (status, kind) => {
    await expect(submitCustomRequest(VALID, null, "t", respond(status))).resolves.toEqual({ kind });
  });

  it("trata un fallo de red como failed", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network");
    }) as unknown as typeof fetch;
    await expect(submitCustomRequest(VALID, null, "t", fetchImpl)).resolves.toEqual({ kind: "failed" });
  });
});

describe("countries", () => {
  it("usa la misma regla que la API", () => {
    expect(isCountryCode("GT")).toBe(true);
    expect(isCountryCode("XK")).toBe(true);
    expect(isCountryCode("XA")).toBe(false);
  });

  it("lista los países en el idioma de la página, ordenados", () => {
    const options = countryOptions("es");
    expect(options.length).toBeGreaterThan(200);
    expect(options.find((option) => option.code === "DE")?.name).toBe("Alemania");
    const names = options.map((option) => option.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
  });
});
