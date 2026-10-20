// Crea una cuenta del admin. La contraseña se escribe en la terminal sin mostrarse;
// nunca va como argumento (quedaría en el historial) ni en el repo.
//   local:   npm run admin:create -- --email persona@ejemplo.com [--role OWNER|EDITOR]
//   Railway: railway ssh → node dist/scripts/create-admin.js --email … (la base no tiene proxy público)
import { parseArgs } from "node:util";
import { ZodError } from "zod";
import { createPrismaClient } from "../lib/db.js";
import { createLogger } from "../lib/logger.js";
import { createPrismaAdminRepository } from "../repositories/admins.js";
import { createAdmin } from "../services/admins.js";

const CTRL_C = "\u0003";
const BACKSPACE = ["\u007f", "\b"];
const ENTER = ["\r", "\n"];

/** Lee una línea sin eco. Sin terminal (stdin por tubería) lee la primera línea tal cual. */
function readHidden(prompt: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    return new Promise((resolve) => {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk: string) => (data += chunk));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0] ?? ""));
    });
  }
  stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === CTRL_C) {
          finish();
          return reject(new Error("Cancelado"));
        }
        if (ENTER.includes(char)) {
          finish();
          stdout.write("\n");
          return resolve(value);
        }
        value = BACKSPACE.includes(char) ? value.slice(0, -1) : value + char;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    stdin.on("data", onData);
  });
}

function describe(error: unknown): string {
  if (error instanceof ZodError) return `Datos inválidos: ${error.issues.map((issue) => issue.path.join(".")).join(", ")}`;
  return error instanceof Error ? error.message : String(error);
}

const logger = createLogger();
const { values } = parseArgs({ options: { email: { type: "string" }, role: { type: "string", default: "OWNER" } } });
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !values.email) {
  logger.error("Uso: create-admin --email <correo> [--role OWNER|EDITOR] (con DATABASE_URL definida)");
  process.exit(1);
}

const prisma = createPrismaClient(databaseUrl);
try {
  const password = await readHidden("Contraseña (mínimo 12 caracteres): ");
  if (process.stdin.isTTY && (await readHidden("Repítela: ")) !== password) throw new Error("Las contraseñas no coinciden");
  // El rol lo valida Zod dentro de createAdmin.
  const admin = await createAdmin(createPrismaAdminRepository(prisma), {
    email: values.email,
    password,
    role: values.role as "OWNER" | "EDITOR",
  });
  // Solo id y rol: el correo es dato personal y no va a los logs.
  logger.info({ id: admin.id, role: admin.role }, "Admin creado");
} catch (error) {
  logger.error({ message: describe(error) }, "No se creó el admin");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
