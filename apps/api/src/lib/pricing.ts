// Motor de costos y precios (PRD §6.1–6.3). Solo fórmulas: tipo de cambio, comisiones, costos fijos,
// tarifa por hora y margen objetivo vienen de CostSettings. Se calcula con Decimal sin redondear a
// mitad de camino; solo el resultado se lleva a centavos.
import { Prisma } from "../generated/prisma/client.js";

const { Decimal } = Prisma;
type Decimal = Prisma.Decimal;

const HUNDRED = new Decimal(100);
const CENTS = 2;

export interface PricingSettings {
  fxUsdGtq: Decimal;
  gatewayPct: Decimal;
  gatewayFixedUsd: Decimal;
  shopifyThirdPartyPct: Decimal;
  monthlyFixedUsd: Decimal;
  expectedUnitsPerMonth: number;
  laborRateGtqPerHour: Decimal;
  targetMarginPct: Decimal;
}

export interface PieceInputs {
  materialsCostGtq: number;
  laborHours: number;
  packagingCostGtq: Decimal;
}

export interface CostBreakdown {
  materialsGtq: Decimal;
  laborGtq: Decimal;
  packagingGtq: Decimal;
  fixedGtq: Decimal;
  totalGtq: Decimal;
  totalUsd: Decimal;
}

export interface PriceOption {
  marginPct: Decimal;
  priceUsd: Decimal;
  feesUsd: Decimal;
  profitUsd: Decimal;
  profitGtq: Decimal;
}

export class PricingError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_SETTINGS" | "MARGIN_UNREACHABLE",
  ) {
    super(message);
    this.name = "PricingError";
  }
}

/** % que se llevan Shopify (proveedor externo) y la pasarela de cada venta. */
export const commissionPct = (settings: PricingSettings): Decimal =>
  settings.gatewayPct.add(settings.shopifyThirdPartyPct);

/** Costo fijo mensual (USD) × tipo de cambio ÷ piezas vendidas al mes, en quetzales. */
export function fixedCostPerPieceGtq(settings: PricingSettings): Decimal {
  const { monthlyFixedUsd, fxUsdGtq, expectedUnitsPerMonth } = settings;
  if (!Number.isInteger(expectedUnitsPerMonth) || expectedUnitsPerMonth <= 0) {
    throw new PricingError("Las piezas vendidas al mes deben ser un entero positivo", "INVALID_SETTINGS");
  }
  return monthlyFixedUsd.mul(fxUsdGtq).div(expectedUnitsPerMonth);
}

/** Materiales + horas × tarifa + empaque + costo fijo por pieza; en quetzales y en dólares. */
export function unitCost(piece: PieceInputs, settings: PricingSettings): CostBreakdown {
  if (settings.fxUsdGtq.lte(0)) throw new PricingError("El tipo de cambio debe ser mayor que 0", "INVALID_SETTINGS");
  const materialsGtq = new Decimal(piece.materialsCostGtq);
  const laborGtq = new Decimal(piece.laborHours).mul(settings.laborRateGtqPerHour);
  const packagingGtq = piece.packagingCostGtq;
  const fixedGtq = fixedCostPerPieceGtq(settings);
  const totalGtq = materialsGtq.add(laborGtq).add(packagingGtq).add(fixedGtq);
  return { materialsGtq, laborGtq, packagingGtq, fixedGtq, totalGtq, totalUsd: totalGtq.div(settings.fxUsdGtq) };
}

/** Margen (utilidad ÷ precio) que se puede pedir: lo que dejan las comisiones, sin llegar al 100 %. */
export const isReachableMargin = (marginPct: Decimal, settings: PricingSettings): boolean =>
  marginPct.gte(0) && marginPct.add(commissionPct(settings)).lt(HUNDRED);

/**
 * Precio mínimo para el margen: P = (costo USD + cargo fijo) ÷ (1 − % comisiones − margen).
 * Se redondea hacia arriba al centavo para que el margen real nunca quede por debajo del pedido.
 */
export function priceForMargin(costUsd: Decimal, marginPct: Decimal, settings: PricingSettings): PriceOption {
  if (!isReachableMargin(marginPct, settings)) {
    throw new PricingError("Con esas comisiones ese margen no se puede alcanzar", "MARGIN_UNREACHABLE");
  }
  const remaining = HUNDRED.sub(commissionPct(settings)).sub(marginPct).div(HUNDRED);
  const priceUsd = costUsd.add(settings.gatewayFixedUsd).div(remaining).toDecimalPlaces(CENTS, Decimal.ROUND_UP);
  const feesUsd = priceUsd.mul(commissionPct(settings)).div(HUNDRED).add(settings.gatewayFixedUsd);
  const profitUsd = priceUsd.sub(feesUsd).sub(costUsd);
  return { marginPct, priceUsd, feesUsd, profitUsd, profitGtq: profitUsd.mul(settings.fxUsdGtq) };
}

/**
 * Márgenes a comparar: el objetivo de CostSettings y uno más bajo y otro más alto a `stepPct`
 * (con el seed, 30 / 40 / 50). Los que no se pueden alcanzar se omiten.
 */
export function suggestionMargins(settings: PricingSettings, stepPct: number): Decimal[] {
  const target = settings.targetMarginPct;
  return [target.sub(stepPct), target, target.add(stepPct)].filter((margin) => isReachableMargin(margin, settings));
}

/** A dos decimales (mitad hacia arriba) para mostrar; el cálculo siempre usa el valor completo. */
export const toMoney = (value: Decimal): number => value.toDecimalPlaces(CENTS, Decimal.ROUND_HALF_UP).toNumber();
