import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { PoolConfig } from "mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import { DB_CONNECTION_LIMIT, DB_CONNECT_TIMEOUT_MS } from "../config.js";

const DEFAULT_MYSQL_PORT = 3306;

// Prisma 7 se conecta con un driver adapter; para MySQL es el de MariaDB.
// Los errores nunca incluyen la URL: lleva la contraseña.
export function toPoolConfig(databaseUrl: string): PoolConfig {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL no es una URL válida");
  }
  if (url.protocol !== "mysql:") throw new Error("DATABASE_URL debe usar el esquema mysql://");

  const database = decodeURIComponent(url.pathname.slice(1));
  if (!database) throw new Error("DATABASE_URL no indica la base de datos");

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : DEFAULT_MYSQL_PORT,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: DB_CONNECTION_LIMIT,
    connectTimeout: DB_CONNECT_TIMEOUT_MS,
    // MySQL 8 usa caching_sha2_password; sin TLS (red privada de Railway, Docker local)
    // el driver necesita pedir la clave pública del servidor para autenticarse.
    allowPublicKeyRetrieval: true,
  };
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaMariaDb(toPoolConfig(databaseUrl)) });
}
