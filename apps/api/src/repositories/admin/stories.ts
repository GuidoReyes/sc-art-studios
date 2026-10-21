// /api/admin/stories: todas las historias, también borradores y programadas.
import type { AdminStoryDto } from "@sc-art-studio/shared";
import type { PrismaClient, Story } from "../../generated/prisma/client.js";
import { type AdminStore, type EntityOps, createAdminStore, toPlain } from "./store.js";

/** `bodyEs`/`bodyEn` llegan ya sanitizados. La portada se sube aparte (R2). */
export interface StoryInput {
  slug: string;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  maskId?: string | null;
  publishedAt?: Date | null;
}

export type StoryPatch = Partial<StoryInput>;

export interface AdminPageQuery {
  page: number;
  limit: number;
}

export type AdminStoryStore = AdminStore<AdminStoryDto, StoryInput, StoryPatch, AdminPageQuery>;

const toDto = (row: Story): AdminStoryDto => toPlain(row);

export const storyOps: EntityOps<AdminStoryDto, StoryInput, StoryPatch, AdminPageQuery> = {
  entity: "Story",
  action: "story",
  duplicateMessage: "Ya existe una historia con ese slug",
  async list(db, { page, limit }) {
    const [rows, total] = await db.$transaction([
      db.story.findMany({ orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.story.count(),
    ]);
    return { items: rows.map(toDto), total };
  },
  find: async (db, id) => {
    const row = await db.story.findUnique({ where: { id } });
    return row ? toDto(row) : null;
  },
  insert: async (tx, input) => toDto(await tx.story.create({ data: input })),
  patch: async (tx, id, input) => toDto(await tx.story.update({ where: { id }, data: input })),
  // Sus videos quedan sin historia (onDelete: SetNull), no se borran.
  delete: async (tx, id) => (await tx.story.deleteMany({ where: { id } })).count,
};

export const createPrismaAdminStoryStore = (prisma: PrismaClient): AdminStoryStore => createAdminStore(prisma, storyOps);
