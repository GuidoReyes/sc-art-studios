// Contrato de POST /api/shipping/quote (PRD §4.5). Solo tipos.

export type ShippingCarrier = "FEDEX" | "POSTAL" | "COURIER_LOCAL" | "OTHER";

export interface ShippingOptionDto {
  carrier: ShippingCarrier;
  service: string;
  /** Lo que paga el cliente: el costo del envío más las comisiones que se lleva el cobro. */
  chargeUsd: number;
  /** true mientras la tarifa sea la publicada y no una cotización con cuenta. */
  isEstimate: boolean;
}

export interface ShippingQuoteDto {
  /** ISO 3166-1 alfa-2, en mayúsculas. */
  country: string;
  /** null si aún no se envía a ese país: `options` sale vacío. */
  zone: string | null;
  /** Del paquete empacado; la tarifa se elige con `billable`. */
  weightGrams: { actual: number; volumetric: number; billable: number };
  /** Del más barato al más caro; vacío si el paquete pasa del tramo más alto. */
  options: ShippingOptionDto[];
}

export interface ShippingQuoteResponse {
  data: ShippingQuoteDto;
}
