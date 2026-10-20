// Punto de entrada de `prisma db seed` (prisma.config.ts → migrations.seed).
import { createPrismaClient } from "../lib/db.js";
import { createLogger } from "../lib/logger.js";
import { seedDatabase } from "./seed.js";

const logger = createLogger();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  logger.error("Falta DATABASE_URL: el seed no sabe a qué base conectarse");
  process.exit(1);
}

const prisma = createPrismaClient(databaseUrl);

try {
  const created = await seedDatabase(prisma);
  logger.info({ created }, "Seed terminado");
} catch (error) {
  // Solo el mensaje: el error del driver puede traer el host de la base.
  logger.error({ message: error instanceof Error ? error.message : String(error) }, "El seed falló");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
