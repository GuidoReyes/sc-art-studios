// /api/admin/videos: videos agregados a mano (los sincronizados llegarán con source SYNC).
import type { AdminVideoDto } from "@sc-art-studio/shared";
import type { PrismaClient, Video, VideoPlatform } from "../../generated/prisma/client.js";
import type { AdminPageQuery } from "./stories.js";
import { type AdminStore, type EntityOps, createAdminStore, toPlain } from "./store.js";

/** `platform` y `externalId` salen de la URL (lib/videoUrls.ts), no los escribe el admin. */
export interface VideoInput {
  platform: VideoPlatform;
  externalId: string;
  url: string;
  title: string;
  thumbnailUrl?: string | null;
  maskId?: string | null;
  storyId?: string | null;
  publishedAt?: Date | null;
}

export type VideoPatch = Partial<VideoInput>;

export interface AdminVideoQuery extends AdminPageQuery {
  maskId?: string;
  storyId?: string;
}

export type AdminVideoStore = AdminStore<AdminVideoDto, VideoInput, VideoPatch, AdminVideoQuery>;

const toDto = (row: Video): AdminVideoDto => toPlain(row);

export const videoOps: EntityOps<AdminVideoDto, VideoInput, VideoPatch, AdminVideoQuery> = {
  entity: "Video",
  action: "video",
  duplicateMessage: "Ese video ya está registrado",
  async list(db, { maskId, storyId, page, limit }) {
    const where = { ...(maskId ? { maskId } : {}), ...(storyId ? { storyId } : {}) };
    const [rows, total] = await db.$transaction([
      db.video.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.video.count({ where }),
    ]);
    return { items: rows.map(toDto), total };
  },
  find: async (db, id) => {
    const row = await db.video.findUnique({ where: { id } });
    return row ? toDto(row) : null;
  },
  insert: async (tx, input) => toDto(await tx.video.create({ data: { ...input, source: "MANUAL" } })),
  patch: async (tx, id, input) => toDto(await tx.video.update({ where: { id }, data: input })),
  delete: async (tx, id) => (await tx.video.deleteMany({ where: { id } })).count,
};

export const createPrismaAdminVideoStore = (prisma: PrismaClient): AdminVideoStore => createAdminStore(prisma, videoOps);
