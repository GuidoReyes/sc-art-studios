import { describe, expect, it, vi } from "vitest";
import { requestShippingQuote } from "./shippingQuote";

const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });
const QUOTE = { country: "US", zone: "FEDEX-C", weightGrams: { actual: 1050, volumetric: 3000, billable: 3000 }, options: [] };

describe("requestShippingQuote", () => {
  it("manda la máscara y el país, y devuelve la cotización", async () => {
    const fetchImpl = vi.fn(async () => json(200, { data: QUOTE }));

    expect(await requestShippingQuote("m1", "US", fetchImpl)).toEqual({ kind: "quote", quote: QUOTE });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/shipping\/quote$/),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ maskId: "m1", country: "US" }) }),
    );
  });

  it.each([
    [422, "incomplete"],
    [429, "rateLimited"],
    [500, "failed"],
    [404, "failed"],
  ])("HTTP %i → %s", async (status, kind) => {
    expect(await requestShippingQuote("m1", "US", vi.fn(async () => json(status)))).toEqual({ kind });
  });

  it("sin red no lanza: avisa para reintentar", async () => {
    expect(await requestShippingQuote("m1", "US", vi.fn(async () => Promise.reject(new TypeError("offline"))))).toEqual({ kind: "failed" });
  });
});
