import { Router } from "express";
import { z } from "zod";
import type { StoryDetailResponse, StoryListResponse } from "@sc-art-studio/shared";
import type { StoryRepository } from "../repositories/stories.js";
import { SlugParamsSchema, noStoreByDefault, pageQueryShape, sendNotFound, sendPublic } from "./public.js";

const ListQuerySchema = z.object(pageQueryShape).strict();

export function createStoriesRouter(stories: StoryRepository): Router {
  const router = Router();
  router.use(noStoreByDefault);

  router.get("/", async (req, res) => {
    const query = ListQuerySchema.parse(req.query);
    const { items, total } = await stories.list(query);
    const body: StoryListResponse = { data: items, meta: { total, page: query.page, limit: query.limit } };
    sendPublic(res, body);
  });

  router.get("/:slug", async (req, res) => {
    const { slug } = SlugParamsSchema.parse(req.params);
    const story = await stories.findBySlug(slug);
    if (!story) return sendNotFound(res);
    const body: StoryDetailResponse = { data: story };
    sendPublic(res, body);
  });

  return router;
}
