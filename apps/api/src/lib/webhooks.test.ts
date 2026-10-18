import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyShopifyHmac } from "./webhooks.js";

const SECRET = "secreto-de-prueba";
const body = Buffer.from(JSON.stringify({ id: 1 }));
const sign = (raw: Buffer, secret = SECRET) => crypto.createHmac("sha256", secret).update(raw).digest("base64");

describe("verifyShopifyHmac", () => {
  it("acepta una firma correcta", () => {
    expect(verifyShopifyHmac(body, sign(body), SECRET)).toBe(true);
  });

  it("rechaza si falta la cabecera", () => {
    expect(verifyShopifyHmac(body, undefined, SECRET)).toBe(false);
  });

  it("rechaza una firma hecha con otro secreto", () => {
    expect(verifyShopifyHmac(body, sign(body, "otro"), SECRET)).toBe(false);
  });

  it("rechaza si el cuerpo fue alterado", () => {
    expect(verifyShopifyHmac(Buffer.from('{"id":2}'), sign(body), SECRET)).toBe(false);
  });

  it("rechaza firmas de otra longitud sin lanzar error", () => {
    expect(verifyShopifyHmac(body, "corta", SECRET)).toBe(false);
  });
});
