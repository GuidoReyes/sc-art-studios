// POST /api/admin/pricing/suggest (tarea 15, PRD §6): costo unitario y precio sugerido de una máscara.
// Solo calcula: no guarda nada, así que no deja AuditLog. El precio lo fija el admin al editar la máscara.
import { Router } from "express";
import type { PricingOption, PricingSuggestion } from "@sc-art-studio/shared";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpErrors.js";
import {
  type PriceOption,
  PricingError,
  commissionPct,
  priceForMargin,
  suggestionMargins,
  toMoney,
  unitCost,
} from "../../lib/pricing.js";
import type { CurrentPricingSettings, PricingRepository } from "../../repositories/admin/pricing.js";
import { decimal } from "./fields.js";

// Distancia entre los márgenes que se comparan (objetivo − 10, objetivo, objetivo + 10). Es una
// forma de mostrar opciones, no un dato de negocio: el margen objetivo vive en CostSettings.
const SUGGESTION_STEP_PCT = 10;

// Mismas columnas que Mask.materialsCostGtq y Mask.laborHours.
const SuggestSchema = z
  .object({
    materialsCostGtq: decimal(10, 2),
    laborHours: decimal(6, 2),
    packagingProfileId: z.cuid(),
  })
  .strict();

const toOption = (option: PriceOption): PricingOption => ({
  marginPct: option.marginPct.toNumber(),
  priceUsd: toMoney(option.priceUsd),
  feesUsd: toMoney(option.feesUsd),
  profitUsd: toMoney(option.profitUsd),
  profitGtq: toMoney(option.profitGtq),
});

function settingsUsed(settings: CurrentPricingSettings): PricingSuggestion["settings"] {
  return {
    fxUsdGtq: settings.fxUsdGtq.toNumber(),
    commissionPct: commissionPct(settings).toNumber(),
    gatewayFixedUsd: settings.gatewayFixedUsd.toNumber(),
    monthlyFixedUsd: settings.monthlyFixedUsd.toNumber(),
    expectedUnitsPerMonth: settings.expectedUnitsPerMonth,
    laborRateGtqPerHour: settings.laborRateGtqPerHour.toNumber(),
    targetMarginPct: settings.targetMarginPct.toNumber(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function suggest(
  input: z.infer<typeof SuggestSchema>,
  packagingCostGtq: Prisma.Decimal,
  settings: CurrentPricingSettings,
): PricingSuggestion {
  const cost = unitCost({ ...input, packagingCostGtq }, settings);
  const optionFor = (margin: Prisma.Decimal) => toOption(priceForMargin(cost.totalUsd, margin, settings));
  return {
    costBreakdown: {
      materialsGtq: toMoney(cost.materialsGtq),
      laborGtq: toMoney(cost.laborGtq),
      packagingGtq: toMoney(cost.packagingGtq),
      fixedGtq: toMoney(cost.fixedGtq),
      totalGtq: toMoney(cost.totalGtq),
      totalUsd: toMoney(cost.totalUsd),
    },
    suggestedPrices: suggestionMargins(settings, SUGGESTION_STEP_PCT).map(optionFor),
    targetPrice: optionFor(settings.targetMarginPct),
    settings: settingsUsed(settings),
  };
}

export function createAdminPricingRouter(repository: PricingRepository): Router {
  const router = Router();

  router.post("/suggest", async (req, res) => {
    const input = SuggestSchema.parse(req.body ?? {});
    const [settings, packagingCostGtq] = await Promise.all([
      repository.findSettings(),
      repository.findPackagingCostGtq(input.packagingProfileId),
    ]);
    if (!settings) throw new Error("No hay CostSettings: correr el seed");
    if (!packagingCostGtq) throw new HttpError(422, "El perfil de empaque no existe", "INVALID_REFERENCE");
    try {
      res.json({ data: suggest(input, packagingCostGtq, settings) });
    } catch (err) {
      // CostSettings con valores que no permiten calcular: el admin debe corregirlos.
      if (err instanceof PricingError) throw new HttpError(422, err.message, err.code);
      throw err;
    }
  });

  return router;
}
