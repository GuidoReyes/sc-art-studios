import { describe, it, expect } from "vitest";
import { createPrismaClient, toPoolConfig } from "./db.js";

describe("createPrismaClient", () => {
  it("crea el cliente con el adapter sin conectarse todavía", () => {
    // Prisma abre la conexión en la primera consulta; aquí no hay base de datos.
    // El cliente es un proxy: se revisan sus métodos en vez de `instanceof`.
    const client = createPrismaClient("mysql://u:p@127.0.0.1:1/app");

    expect(typeof client.$connect).toBe("function");
    expect(typeof client.mask.findMany).toBe("function");
    expect(typeof client.costSettings.findFirst).toBe("function");
  });

  it("falla antes de crear el cliente si la URL es inválida", () => {
    expect(() => createPrismaClient("no-es-url")).toThrow(/DATABASE_URL/);
  });
});

describe("toPoolConfig", () => {
  it("convierte la URL de MySQL en la config del pool", () => {
    const config = toPoolConfig("mysql://sc_app:secreto@127.0.0.1:3307/sc_art_studio");

    expect(config).toMatchObject({
      host: "127.0.0.1",
      port: 3307,
      user: "sc_app",
      password: "secreto",
      database: "sc_art_studio",
    });
  });

  it("usa el puerto 3306 cuando la URL no lo trae", () => {
    expect(toPoolConfig("mysql://u:p@mysql.railway.internal/railway").port).toBe(3306);
  });

  it("decodifica usuario y contraseña con caracteres especiales", () => {
    const config = toPoolConfig("mysql://us%40r:p%3Ass%2Fw%23rd@db/app");

    expect(config.user).toBe("us@r");
    expect(config.password).toBe("p:ss/w#rd");
  });

  it("permite pedir la clave pública del servidor (MySQL 8 sin TLS en red privada)", () => {
    expect(toPoolConfig("mysql://u:p@db/app").allowPublicKeyRetrieval).toBe(true);
  });

  it("rechaza un esquema que no es mysql sin mostrar la URL", () => {
    expect(() => toPoolConfig("postgres://u:secreto@db/app")).toThrow(/DATABASE_URL/);
    expect(() => toPoolConfig("postgres://u:secreto@db/app")).not.toThrow(/secreto/);
  });

  it("rechaza una URL sin nombre de base de datos", () => {
    expect(() => toPoolConfig("mysql://u:p@db/")).toThrow(/base de datos/);
  });

  it("rechaza texto que no es una URL sin mostrarlo", () => {
    expect(() => toPoolConfig("secreto-no-url")).toThrow(/DATABASE_URL/);
    expect(() => toPoolConfig("secreto-no-url")).not.toThrow(/secreto/);
  });
});
