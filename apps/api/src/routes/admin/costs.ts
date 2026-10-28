// Costos y envíos del admin (tarea 42, PRD §6.5): parámetros del motor de costos, tarifas de envío
// por zona y cajas. Todo cambio queda en AuditLog.
import { type Router, Router as createRouter } from "express";
import type { AdminCostSettingsDto } from "@sc-art-studio/shared";
import { z } from "zod";
import { COST_SETTINGS_HISTORY, DUTY_REVIEW_DAYS, QUOTE_MAX_SIDE_CM, QUOTE_MAX_WEIGHT_GRAMS } from "../../config.js";
import { Prisma } from "../../generated/prisma/client.js";
import { type CostSettingsRepository, dutyReviewStatus } from "../../repositories/admin/costSettings.js";
import type { AdminPackagingProfileStore } from "../../repositories/admin/packagingProfiles.js";
import type { AdminShippingRateStore, ShippingZoneRepository } from "../../repositories/admin/shippingRates.js";
import { pageQueryShape } from "../public.js";
import { actorOf, createCrudRouter } from "./crud.js";
import { NOT_EMPTY_MESSAGE, decimal, isoDate, notEmpty, text } from "./fields.js";

const HUNDRED = 100;
// Topes de las columnas Int: generosos, solo evitan valores absurdos.
const MAX_UNITS_PER_MONTH = 10_000;
const MAX_VOLUMETRIC_DIVISOR = 100_000;
const CARRIERS = ["FEDEX", "POSTAL", "COURIER_LOCAL", "OTHER"] as const;

const pct = decimal(5, 2).max(HUNDRED);

// Mismas columnas que CostSettings en schema.prisma.
const CostSettingsValuesSchema = z
  .object({
    fxUsdGtq: decimal(10, 4).positive(),
    gatewayPct: pct,
    gatewayFixedUsd: decimal(8, 2),
    shopifyThirdPartyPct: pct,
    monthlyFixedUsd: decimal(10, 2),
    expectedUnitsPerMonth: z.number().int().min(1).max(MAX_UNITS_PER_MONTH),
    laborRateGtqPerHour: decimal(10, 2),
    targetMarginPct: pct,
    volumetricDivisor: z.number().int().min(1).max(MAX_VOLUMETRIC_DIVISOR),
    usImportDutyPct: pct,
  })
  .strict()
  // Mismo límite que lib/pricing.ts: si comisiones + margen llegan a 100 %, no hay precio posible.
  .refine(
    ({ gatewayPct, shopifyThirdPartyPct, targetMarginPct }) =>
      new Prisma.Decimal(gatewayPct).add(shopifyThirdPartyPct).add(targetMarginPct).lt(HUNDRED),
    { message: "Las comisiones más el margen objetivo deben sumar menos de 100 %", path: ["targetMarginPct"] },
  );

const SaveCostSettingsSchema = z
  .object({
    baseVersionId: z.number().int().positive(),
    values: CostSettingsValuesSchema,
    dutyReviewed: z.boolean().optional(),
  })
  .strict();

export function createAdminCostSettingsRouter(repository: CostSettingsRepository, now: () => Date = () => new Date()): Router {
  const router = createRouter();

  router.get("/", async (_req, res) => {
    const overview = await repository.overview(COST_SETTINGS_HISTORY);
    if (!overview) throw new Error("No hay CostSettings: correr el seed");
    const review = dutyReviewStatus(new Date(overview.current.usImportDutyReviewedAt), now(), DUTY_REVIEW_DAYS);
    const data: AdminCostSettingsDto = { ...overview, dutyReview: { dueAt: review.dueAt.toISOString(), isDue: review.isDue } };
    res.json({ data });
  });

  router.put("/", async (req, res) => {
    const input = SaveCostSettingsSchema.parse(req.body ?? {});
    res.json({ data: await repository.save(input, actorOf(req, res), now()) });
  });

  return router;
}

const rateFields = {
  carrier: z.enum(CARRIERS),
  service: text(80),
  zoneId: z.cuid(),
  maxWeightKg: decimal(6, 2).positive().max(QUOTE_MAX_WEIGHT_GRAMS / 1000),
  costUsd: decimal(10, 2),
  validFrom: isoDate,
  validTo: isoDate.nullable(),
  source: text(500),
  isEstimate: z.boolean(),
};

const RateCreateSchema = z
  .object({ ...rateFields, validTo: rateFields.validTo.optional(), isEstimate: rateFields.isEstimate.optional() })
  .strict();
const RateUpdateSchema = z.object(rateFields).partial().strict().refine(notEmpty, NOT_EMPTY_MESSAGE);
const RateQuerySchema = z.object({ zoneId: z.cuid().optional(), ...pageQueryShape }).strict();

export const createAdminShippingRatesRouter = (store: AdminShippingRateStore): Router =>
  createCrudRouter(store, { query: RateQuerySchema, create: RateCreateSchema, update: RateUpdateSchema });

export function createAdminShippingZonesRouter(repository: ShippingZoneRepository): Router {
  const router = createRouter();
  router.get("/", async (_req, res) => {
    res.json({ data: await repository.list() });
  });
  return router;
}

// Medidas con los topes del cotizador: una caja que no cabe en un bulto de courier no se puede enviar.
const side = decimal(6, 1).positive().max(QUOTE_MAX_SIDE_CM);

const boxFields = {
  name: text(80),
  innerLengthCm: side,
  innerWidthCm: side,
  innerHeightCm: side,
  outerLengthCm: side,
  outerWidthCm: side,
  outerHeightCm: side,
  packagingWeightGrams: z.number().int().min(0).max(QUOTE_MAX_WEIGHT_GRAMS),
  costGtq: decimal(10, 2),
};

const BoxCreateSchema = z.object(boxFields).strict();
const BoxUpdateSchema = z.object(boxFields).partial().strict().refine(notEmpty, NOT_EMPTY_MESSAGE);
const BoxQuerySchema = z.object(pageQueryShape).strict();

export const createAdminPackagingProfilesRouter = (store: AdminPackagingProfileStore): Router =>
  createCrudRouter(store, { query: BoxQuerySchema, create: BoxCreateSchema, update: BoxUpdateSchema });
