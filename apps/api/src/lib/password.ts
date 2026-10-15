import argon2 from "argon2";

// Capa 1: contraseñas solo con argon2id. Nunca guardar ni devolver la contraseña en texto plano.
export const hashPassword = (plain: string) =>
  argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

export const verifyPassword = (hash: string, plain: string) => argon2.verify(hash, plain);
