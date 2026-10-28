// GET /api/admin/dashboard (tarea 33): solo lee, así que no deja AuditLog.
import { Router } from "express";
import type { AdminDashboardResponse } from "@sc-art-studio/shared";
import type { DashboardRepository } from "../../repositories/admin/dashboard.js";

export function createAdminDashboardRouter(repository: DashboardRepository): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    const body: AdminDashboardResponse = { data: await repository.summary() };
    res.json(body);
  });
  return router;
}
