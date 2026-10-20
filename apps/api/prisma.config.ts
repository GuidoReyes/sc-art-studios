import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 ya no carga .env por su cuenta. En local se lee apps/api/.env;
// en Railway las variables llegan del entorno y el archivo no existe.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Solo crea lo que falta (src/seed/seed.ts); en Railway, sin tsx, se usa `node dist/seed/index.js`.
    seed: "tsx src/seed/index.ts",
  },
  datasource: {
    // `prisma generate` (CI, build) no se conecta: puede correr sin DATABASE_URL.
    // migrate y studio sí la necesitan y fallan con un error claro si falta.
    url: process.env.DATABASE_URL ?? "",
  },
});
