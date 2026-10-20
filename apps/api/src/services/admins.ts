// Alta de cuentas del admin desde la terminal (scripts/create-admin.ts). Nunca hay contraseñas en el repo.
import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../config.js";
import { hashPassword } from "../lib/password.js";
import type { AdminIdentity, AdminRepository } from "../repositories/admins.js";

export const NewAdminSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
    role: z.enum(["OWNER", "EDITOR"]),
  })
  .strict();

export type NewAdmin = z.input<typeof NewAdminSchema>;

export class AdminExistsError extends Error {
  constructor() {
    super("Ya existe un admin con ese correo");
  }
}

/** Valida, hashea con argon2id y crea la cuenta. No actualiza una existente. */
export async function createAdmin(
  repository: AdminRepository,
  input: NewAdmin,
  hash: (plain: string) => Promise<string> = hashPassword,
): Promise<AdminIdentity> {
  const { email, password, role } = NewAdminSchema.parse(input);
  if (await repository.findByEmail(email)) throw new AdminExistsError();
  return repository.createAdmin({ email, role, passwordHash: await hash(password) });
}
