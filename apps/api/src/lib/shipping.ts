// Cálculo del cotizador de envío (PRD §6.1 y §6.4). Solo fórmulas: las tarifas, el divisor
// y las comisiones vienen de la base de datos. Todo en enteros (gramos, décimas de cm,
// centavos y puntos básicos) para no arrastrar errores de punto flotante.
import type { Carrier } from "../generated/prisma/client.js";

const BASIS_POINTS = 10_000; // 100 %
const TENTHS_PER_CM = 10;

/** Paquete listo para enviar: peso y medidas exteriores de la caja. */
export interface Parcel {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface RateCandidate {
  carrier: Carrier;
  service: string;
  maxWeightGrams: number;
  costCents: number;
  isEstimate: boolean;
}

export interface QuotedRate extends RateCandidate {
  chargeCents: number;
}

export interface ParcelWeights {
  actual: number;
  volumetric: number;
  billable: number;
}

/**
 * Peso volumétrico en gramos: (L × A × H) cm³ ÷ divisor da kilos. En décimas de cm el volumen
 * queda ×1000, que es justo el paso de kilos a gramos. Se redondea hacia arriba, como el transportista.
 */
export function volumetricGrams(parcel: Parcel, divisor: number): number {
  if (!Number.isInteger(divisor) || divisor <= 0) throw new Error("Divisor volumétrico inválido");
  const [length, width, height] = [parcel.lengthCm, parcel.widthCm, parcel.heightCm].map((cm) =>
    Math.round(cm * TENTHS_PER_CM),
  );
  return Math.ceil((length * width * height) / divisor);
}

/** Peso facturable = max(peso real empacado, peso volumétrico). */
export function parcelWeights(parcel: Parcel, divisor: number): ParcelWeights {
  const volumetric = volumetricGrams(parcel, divisor);
  return { actual: parcel.weightGrams, volumetric, billable: Math.max(parcel.weightGrams, volumetric) };
}

/**
 * Lo que se cobra para que, después de las comisiones (que también se llevan su % del envío),
 * quede el costo completo: costo ÷ (1 − % comisiones). Hacia arriba al centavo: nunca se pierde.
 */
export function chargeCents(costCents: number, commissionBasisPoints: number): number {
  if (commissionBasisPoints < 0 || commissionBasisPoints >= BASIS_POINTS) {
    throw new Error("Comisión fuera de rango");
  }
  return Math.ceil((costCents * BASIS_POINTS) / (BASIS_POINTS - commissionBasisPoints));
}

/**
 * Por cada transportista y servicio, el tramo más ajustado que aguanta el peso facturable
 * (las tarifas redondean al tramo superior). Ordenado del más barato al más caro.
 */
export function quoteRates(
  rates: readonly RateCandidate[],
  billableGrams: number,
  commissionBasisPoints: number,
): QuotedRate[] {
  const best = new Map<string, RateCandidate>();
  for (const rate of rates) {
    if (rate.maxWeightGrams < billableGrams) continue;
    const key = `${rate.carrier}|${rate.service}`;
    const current = best.get(key);
    if (!current || rate.maxWeightGrams < current.maxWeightGrams) best.set(key, rate);
  }
  return [...best.values()]
    .map((rate) => ({ ...rate, chargeCents: chargeCents(rate.costCents, commissionBasisPoints) }))
    .sort((a, b) => a.chargeCents - b.chargeCents || a.service.localeCompare(b.service));
}
