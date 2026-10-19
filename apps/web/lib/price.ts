// Solo formato y conversión: el precio y el tipo de cambio llegan de Shopify y de CostSettings, nunca de aquí.

const groupedNumber = (fractionDigits: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

const WHOLE = groupedNumber(0);
const CENTS = groupedNumber(2);

function assertAmount(amount: number, label: string): void {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError(`${label} debe ser un número mayor o igual a 0`);
}

/** US$95 · US$77.30 · US$1,250 */
export function formatUsd(amount: number): string {
  assertAmount(amount, "El monto en USD");
  return `US$${(Number.isInteger(amount) ? WHOLE : CENTS).format(amount)}`;
}

/** Monto aproximado en quetzales, redondeado al entero. */
export function usdToGtq(usd: number, gtqPerUsd: number): number {
  assertAmount(usd, "El monto en USD");
  if (!Number.isFinite(gtqPerUsd) || gtqPerUsd <= 0) throw new RangeError("El tipo de cambio debe ser mayor que 0");
  return Math.round(usd * gtqPerUsd);
}

/** Q726 · Q7,645 */
export function formatGtq(amount: number): string {
  assertAmount(amount, "El monto en GTQ");
  return `Q${WHOLE.format(amount)}`;
}
