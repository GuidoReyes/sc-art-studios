import { describe, expect, it, vi } from "vitest";
import { TURNSTILE_VERIFY_URL, TurnstileUnavailableError, createTurnstileVerifier } from "./turnstile.js";

const SECRET = "0x4AAAAAAAsecreto";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function verifier(responses: (Response | Error)[]) {
  const fetchFn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const next = responses.shift();
    if (!next) throw new Error("sin respuesta preparada");
    if (next instanceof Error) throw next;
    return next;
  });
  return { fetchFn, verify: createTurnstileVerifier({ secret: SECRET, fetchFn, timeoutMs: 50 }) };
}

const sentForm = (fetchFn: ReturnType<typeof vi.fn>, call = 0) =>
  new URLSearchParams(String((fetchFn.mock.calls[call]?.[1] as RequestInit).body));

describe("createTurnstileVerifier", () => {
  it("acepta el token cuando Cloudflare responde success", async () => {
    const { verify, fetchFn } = verifier([json({ success: true })]);

    expect(await verify("token-ok", "203.0.113.7")).toBe(true);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(TURNSTILE_VERIFY_URL);
    const form = sentForm(fetchFn);
    expect(form.get("secret")).toBe(SECRET);
    expect(form.get("response")).toBe("token-ok");
    expect(form.get("remoteip")).toBe("203.0.113.7");
    expect(form.get("idempotency_key")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rechaza el token cuando Cloudflare responde que no es válido", async () => {
    const { verify } = verifier([json({ success: false, "error-codes": ["invalid-input-response"] })]);

    expect(await verify("token-malo")).toBe(false);
  });

  it("reintenta una vez con la misma llave de idempotencia si Cloudflare falla", async () => {
    const { verify, fetchFn } = verifier([json({}, 503), json({ success: true })]);

    expect(await verify("token-ok")).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sentForm(fetchFn, 1).get("idempotency_key")).toBe(sentForm(fetchFn, 0).get("idempotency_key"));
  });

  it("después de dos fallas de red avisa que el servicio no está disponible", async () => {
    const { verify, fetchFn } = verifier([new TypeError("fetch failed"), new TypeError("fetch failed")]);

    await expect(verify("token")).rejects.toBeInstanceOf(TurnstileUnavailableError);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("corta la espera con el timeout", async () => {
    const fetchFn = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const verify = createTurnstileVerifier({ secret: SECRET, fetchFn, timeoutMs: 20 });

    await expect(verify("token")).rejects.toBeInstanceOf(TurnstileUnavailableError);
  });

  it("trata una respuesta sin el campo success como falla del servicio, no como aprobación", async () => {
    const { verify } = verifier([json({ ok: true }), json({ ok: true })]);

    await expect(verify("token")).rejects.toBeInstanceOf(TurnstileUnavailableError);
  });

  it("no incluye el secreto en el mensaje de error", async () => {
    const { verify } = verifier([json({}, 500), json({}, 500)]);

    await expect(verify("token")).rejects.not.toThrow(new RegExp(SECRET));
  });
});
