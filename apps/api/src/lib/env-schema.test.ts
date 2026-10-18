import { describe, it, expect } from "vitest";
import { parseEnv } from "./env-schema.js";

const valid = {
  DATABASE_URL: "mysql://u:p@127.0.0.1:3306/db",
  JWT_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  FRONTEND_URL: "https://scartstudios.com",
};

describe("parseEnv", () => {
  it("aplica valores por defecto de puerto, nivel de log y entorno", () => {
    const env = parseEnv(valid);

    expect(env.PORT).toBe(8080);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.NODE_ENV).toBe("development");
  });

  it("normaliza FRONTEND_URL a su origen (sin barra final ni ruta)", () => {
    expect(parseEnv({ ...valid, FRONTEND_URL: "https://scartstudios.com/es/" }).FRONTEND_URL).toBe(
      "https://scartstudios.com",
    );
  });

  it("rechaza FRONTEND_URL con un esquema que no es http(s)", () => {
    expect(() => parseEnv({ ...valid, FRONTEND_URL: "ftp://scartstudios.com" })).toThrow(/FRONTEND_URL/);
  });

  it("exige que JWT_SECRET y JWT_REFRESH_SECRET sean distintos", () => {
    expect(() => parseEnv({ ...valid, JWT_REFRESH_SECRET: valid.JWT_SECRET })).toThrow(/JWT_REFRESH_SECRET/);
  });

  it("trata las variables vacías como no definidas", () => {
    const env = parseEnv({ ...valid, SHOPIFY_WEBHOOK_SECRET: "" });

    expect(env.SHOPIFY_WEBHOOK_SECRET).toBeUndefined();
  });

  it("falla nombrando las variables inválidas sin mostrar sus valores", () => {
    const secret = "corto-y-secreto";

    const run = () => parseEnv({ ...valid, JWT_SECRET: secret, DATABASE_URL: undefined });

    expect(run).toThrow(/JWT_SECRET/);
    expect(run).toThrow(/DATABASE_URL/);
    expect(run).not.toThrow(new RegExp(secret));
  });
});
