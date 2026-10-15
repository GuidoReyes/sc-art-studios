import crypto from "node:crypto";

// Capa 6: verificar HMAC de webhooks (Shopify envía X-Shopify-Hmac-Sha256 en base64 sobre el body crudo).
export function verifyShopifyHmac(rawBody: Buffer, hmacHeader: string | undefined, secret: string): boolean {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
