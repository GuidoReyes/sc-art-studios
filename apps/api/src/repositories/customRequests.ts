import type { PrismaClient } from "../generated/prisma/client.js";

/** Datos ya validados del formulario. Son personales: nunca se escriben en los logs. */
export interface NewCustomRequest {
  name: string;
  email: string;
  whatsapp?: string;
  country: string; // ISO 3166-1 alfa-2
  idea: string;
  colors?: string;
  size?: string;
  use?: string;
  desiredDate?: Date;
  referenceR2Key?: string;
}

export interface CustomRequestRepository {
  create(input: NewCustomRequest): Promise<{ id: string }>;
}

export function createPrismaCustomRequestRepository(prisma: PrismaClient): CustomRequestRepository {
  return {
    // `status` lo fija la API, no el formulario: un encargo siempre entra como NEW.
    create: (input) => prisma.customRequest.create({ data: { ...input, status: "NEW" }, select: { id: true } }),
  };
}
