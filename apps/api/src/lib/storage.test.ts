import { describe, expect, it, vi } from "vitest";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createR2Storage, r2ClientConfig } from "./storage.js";

const CONFIG = {
  accountId: "0123456789abcdef0123456789abcdef",
  accessKeyId: "llave",
  secretAccessKey: "secreto",
  bucket: "sc-art-studio-privado",
};

describe("r2ClientConfig", () => {
  it("apunta al endpoint S3 de la cuenta con región auto y pocos reintentos", () => {
    const config = r2ClientConfig(CONFIG);

    expect(config.endpoint).toBe("https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com");
    expect(config.region).toBe("auto");
    expect(config.maxAttempts).toBe(2);
    expect(config.credentials).toEqual({ accessKeyId: "llave", secretAccessKey: "secreto" });
  });
});

describe("createR2Storage", () => {
  it("sube el objeto al bucket privado con su tipo y sin acceso público", async () => {
    const send = vi.fn(async () => ({}));
    const storage = createR2Storage(CONFIG, { send });
    const data = Buffer.from("webp");

    await storage.put("custom-requests/abc.webp", data, "image/webp");

    const command = send.mock.calls[0]?.[0 as never] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: CONFIG.bucket,
      Key: "custom-requests/abc.webp",
      Body: data,
      ContentType: "image/webp",
      CacheControl: "private, no-store",
    });
  });

  it("borra un objeto del bucket privado", async () => {
    const send = vi.fn(async () => ({}));

    await createR2Storage(CONFIG, { send }).remove("custom-requests/abc.webp");

    const command = send.mock.calls[0]?.[0 as never] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: CONFIG.bucket, Key: "custom-requests/abc.webp" });
  });

  it("propaga el error de R2 para que la ruta responda 5xx", async () => {
    const send = vi.fn(async () => Promise.reject(new Error("R2 caído")));

    await expect(createR2Storage(CONFIG, { send }).put("k", Buffer.alloc(1), "image/webp")).rejects.toThrow(
      "R2 caído",
    );
  });
});
