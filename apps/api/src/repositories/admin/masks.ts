// /api/admin/masks: todas las máscaras, borradores y costos internos incluidos.
import type { AdminMaskDto } from "@sc-art-studio/shared";
import type { Mask, MaskStatus, PrismaClient } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpErrors.js";
import { type AdminStore, type EntityOps, createAdminStore, toPlain } from "./store.js";

/** Lo que el admin edita a mano. Precio e IDs de Shopify los fija la publicación (tarea 20). */
export interface MaskInput {
  slug: string;
  nameEs: string;
  nameEn: string;
  animal: string;
  descriptionEs: string;
  descriptionEn: string;
  storyEs?: string | null;
  storyEn?: string | null;
  status?: MaskStatus;
  priceUsd?: number | null;
  priceGtq?: number | null;
  weightGrams?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  materialsCostGtq?: number | null;
  laborHours?: number | null;
  packagingProfileId?: string | null;
  featured?: boolean;
}

export type MaskPatch = Partial<MaskInput>;

export interface AdminMaskQuery {
  status?: MaskStatus;
  page: number;
  limit: number;
}

export type AdminMaskStore = AdminStore<AdminMaskDto, MaskInput, MaskPatch, AdminMaskQuery>;

// Vendida o reservada: hay un pedido o un pago en curso que la necesita.
const UNDELETABLE = ["SOLD", "RESERVED"] as const satisfies readonly MaskStatus[];

const toDto = (row: Mask): AdminMaskDto => toPlain(row);

export function assertMaskDeletable(mask: AdminMaskDto): void {
  if (mask.status === "SOLD") throw new HttpError(409, "No se puede eliminar una máscara vendida", "MASK_SOLD");
  if (mask.status === "RESERVED") throw new HttpError(409, "No se puede eliminar una máscara reservada", "MASK_RESERVED");
  // Borrarla aquí dejaría el producto huérfano en Shopify.
  if (mask.shopifyProductId) {
    throw new HttpError(409, "Está publicada en Shopify: archívala allí antes de eliminarla", "MASK_IN_SHOPIFY");
  }
}

export const maskOps: EntityOps<AdminMaskDto, MaskInput, MaskPatch, AdminMaskQuery> = {
  entity: "Mask",
  action: "mask",
  duplicateMessage: "Ya existe una máscara con ese slug",
  async list(db, { status, page, limit }) {
    const where = status ? { status } : {};
    const [rows, total] = await db.$transaction([
      db.mask.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.mask.count({ where }),
    ]);
    return { items: rows.map(toDto), total };
  },
  find: async (db, id) => {
    const row = await db.mask.findUnique({ where: { id } });
    return row ? toDto(row) : null;
  },
  insert: async (tx, input) => toDto(await tx.mask.create({ data: input })),
  patch: async (tx, id, input) => toDto(await tx.mask.update({ where: { id }, data: input })),
  assertDeletable: assertMaskDeletable,
  // Las mismas condiciones en el WHERE: si un webhook la vendió justo ahora, no se borra.
  delete: async (tx, id) =>
    (await tx.mask.deleteMany({ where: { id, status: { notIn: [...UNDELETABLE] }, shopifyProductId: null } })).count,
};

export const createPrismaAdminMaskStore = (prisma: PrismaClient): AdminMaskStore => createAdminStore(prisma, maskOps);
