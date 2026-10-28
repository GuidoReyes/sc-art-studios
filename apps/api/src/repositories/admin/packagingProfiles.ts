// /api/admin/packaging-profiles (tarea 42): cajas con medidas interiores y exteriores, peso y costo.
// El cotizador usa las exteriores y el peso; el motor de precios, el costo.
import type { AdminPackagingProfileDto } from "@sc-art-studio/shared";
import type { PackagingProfile, PrismaClient } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpErrors.js";
import type { AdminPageQuery } from "./stories.js";
import { type AdminStore, type EntityOps, createAdminStore, toPlain } from "./store.js";

export interface PackagingProfileInput {
  name: string;
  innerLengthCm: number;
  innerWidthCm: number;
  innerHeightCm: number;
  outerLengthCm: number;
  outerWidthCm: number;
  outerHeightCm: number;
  packagingWeightGrams: number;
  costGtq: number;
}

export type PackagingProfilePatch = Partial<PackagingProfileInput>;

export type AdminPackagingProfileStore = AdminStore<
  AdminPackagingProfileDto,
  PackagingProfileInput,
  PackagingProfilePatch,
  AdminPageQuery
>;

type Dimensions = Pick<
  PackagingProfileInput,
  "innerLengthCm" | "innerWidthCm" | "innerHeightCm" | "outerLengthCm" | "outerWidthCm" | "outerHeightCm"
>;

const SIDES = ["Length", "Width", "Height"] as const;

/** La caja por fuera no puede ser más chica que por dentro. */
export function assertOuterFitsInner(box: Dimensions): void {
  if (SIDES.some((side) => box[`outer${side}Cm`] < box[`inner${side}Cm`])) {
    throw new HttpError(422, "Las medidas exteriores no pueden ser menores que las interiores", "INVALID_DIMENSIONS");
  }
}

const include = { _count: { select: { masks: true } } } as const;

function toDto({ _count, ...row }: PackagingProfile & { _count: { masks: number } }): AdminPackagingProfileDto {
  return { ...toPlain(row), maskCount: _count.masks };
}

const dimensionsOf = (row: PackagingProfile): Dimensions => {
  const plain = toPlain(row);
  return {
    innerLengthCm: plain.innerLengthCm,
    innerWidthCm: plain.innerWidthCm,
    innerHeightCm: plain.innerHeightCm,
    outerLengthCm: plain.outerLengthCm,
    outerWidthCm: plain.outerWidthCm,
    outerHeightCm: plain.outerHeightCm,
  };
};

export const packagingProfileOps: EntityOps<
  AdminPackagingProfileDto,
  PackagingProfileInput,
  PackagingProfilePatch,
  AdminPageQuery
> = {
  entity: "PackagingProfile",
  action: "packagingProfile",
  duplicateMessage: "Ya hay una caja con ese nombre",
  async list(db, { page, limit }) {
    const [rows, total] = await db.$transaction([
      db.packagingProfile.findMany({ include, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
      db.packagingProfile.count(),
    ]);
    return { items: rows.map(toDto), total };
  },
  find: async (db, id) => {
    const row = await db.packagingProfile.findUnique({ where: { id }, include });
    return row ? toDto(row) : null;
  },
  insert: async (tx, input) => {
    assertOuterFitsInner(input);
    return toDto(await tx.packagingProfile.create({ data: input, include }));
  },
  patch: async (tx, id, input) => {
    const current = await tx.packagingProfile.findUniqueOrThrow({ where: { id } });
    assertOuterFitsInner({ ...dimensionsOf(current), ...input });
    return toDto(await tx.packagingProfile.update({ where: { id }, data: input, include }));
  },
  // La DB dejaría borrarla (las máscaras quedarían sin caja), pero el cotizador dejaría de cotizarlas.
  assertDeletable(current) {
    if (current.maskCount > 0) {
      throw new HttpError(409, "Hay máscaras que usan esta caja. Cámbiales la caja antes de borrarla.", "IN_USE");
    }
  },
  delete: async (tx, id) => (await tx.packagingProfile.deleteMany({ where: { id, masks: { none: {} } } })).count,
};

export const createPrismaAdminPackagingProfileStore = (prisma: PrismaClient): AdminPackagingProfileStore =>
  createAdminStore(prisma, packagingProfileOps);
