// Las cinco rutas de cada recurso del admin: listar, ver, crear, actualizar y eliminar.
import { type Request, type Response, Router } from "express";
import type { z } from "zod";
import type { Actor, AdminStore } from "../../repositories/admin/store.js";
import { sendNotFound } from "../public.js";
import { IdParamsSchema } from "./fields.js";

export interface CrudSchemas<Create, Update, Query> {
  query: z.ZodType<Query>;
  create: z.ZodType<Create>;
  update: z.ZodType<Update>;
}

function actorOf(req: Request, res: Response): Actor {
  const admin = res.locals.admin;
  if (!admin) throw new Error("La ruta del admin se montó sin requireAdmin");
  return { userId: admin.id, ip: req.ip };
}

export function createCrudRouter<Dto, Create, Update, Query extends { page: number; limit: number }>(
  store: AdminStore<Dto, Create, Update, Query>,
  schemas: CrudSchemas<Create, Update, Query>,
): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const query = schemas.query.parse(req.query);
    const { items, total } = await store.list(query);
    res.json({ data: items, meta: { total, page: query.page, limit: query.limit } });
  });

  router.get("/:id", async (req, res) => {
    const item = await store.get(IdParamsSchema.parse(req.params).id);
    if (!item) return sendNotFound(res);
    res.json({ data: item });
  });

  router.post("/", async (req, res) => {
    const input = schemas.create.parse(req.body ?? {});
    res.status(201).json({ data: await store.create(input, actorOf(req, res)) });
  });

  router.put("/:id", async (req, res) => {
    const { id } = IdParamsSchema.parse(req.params);
    const input = schemas.update.parse(req.body ?? {});
    const item = await store.update(id, input, actorOf(req, res));
    if (!item) return sendNotFound(res);
    res.json({ data: item });
  });

  router.delete("/:id", async (req, res) => {
    const { id } = IdParamsSchema.parse(req.params);
    if (!(await store.remove(id, actorOf(req, res)))) return sendNotFound(res);
    res.status(204).end();
  });

  return router;
}
