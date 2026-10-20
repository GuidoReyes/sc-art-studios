// Valores iniciales de la base de datos (PRD §6.2 y §6.4). Son datos, no constantes de la app:
// se cargan una vez con `npm run prisma:seed` y desde ahí se cambian en el admin.
// Los decimales van como texto para que lleguen exactos a las columnas DECIMAL.
import type { Carrier, MaskStatus } from "../generated/prisma/client.js";

export interface SeedShippingZone {
  code: string;
  name: string;
  countries: readonly string[]; // ISO 3166-1 alfa-2
}

export interface SeedShippingRate {
  zoneCode: string;
  carrier: Carrier;
  service: string;
  maxWeightKg: string;
  costUsd: string;
  validFrom: Date;
  source: string;
}

export interface SeedPackagingProfile {
  name: string;
  innerLengthCm: string;
  innerWidthCm: string;
  innerHeightCm: string;
  outerLengthCm: string;
  outerWidthCm: string;
  outerHeightCm: string;
  packagingWeightGrams: number;
  costGtq: string;
}

export interface SeedCostSettings {
  fxUsdGtq: string;
  gatewayPct: string;
  gatewayFixedUsd: string;
  shopifyThirdPartyPct: string;
  monthlyFixedUsd: string;
  expectedUnitsPerMonth: number;
  laborRateGtqPerHour: string;
  targetMarginPct: string;
  volumetricDivisor: number;
  usImportDutyPct: string;
}

export interface SeedMask {
  slug: string;
  nameEs: string;
  nameEn: string;
  animal: string;
  descriptionEs: string;
  descriptionEn: string;
  status: MaskStatus;
}

export const SHIPPING_ZONES: readonly SeedShippingZone[] = [
  { code: "FEDEX-C", name: "FedEx zona C (EE. UU., México, Canadá)", countries: ["US", "MX", "CA"] },
  { code: "FEDEX-E", name: "FedEx zona E (España, Alemania)", countries: ["ES", "DE"] },
  { code: "FEDEX-F", name: "FedEx zona F (Australia)", countries: ["AU"] },
];

const FEDEX_GT_2026 = "https://www.fedex.com/content/dam/fedex/international/rates/fedex-rates-all-es-gt-2026.pdf";
const FEDEX_GT_2026_VALID_FROM = new Date("2026-01-05T00:00:00Z");

// [zona, servicio, kg máximos, US$]. Tarifa sin impuestos ni recargo por combustible.
const FEDEX_TABLE: readonly (readonly [string, string, string, string])[] = [
  ["FEDEX-C", "International Economy", "1.0", "138.80"],
  ["FEDEX-C", "International Economy", "1.5", "159.20"],
  ["FEDEX-C", "International Economy", "2.0", "179.60"],
  ["FEDEX-C", "International Economy", "2.5", "200.00"],
  ["FEDEX-C", "International Economy", "3.0", "227.40"],
  ["FEDEX-C", "International Economy", "5.0", "337.00"],
  ["FEDEX-E", "International Economy", "1.0", "183.50"],
  ["FEDEX-E", "International Economy", "2.0", "241.30"],
  ["FEDEX-E", "International Economy", "3.0", "299.40"],
  ["FEDEX-E", "International Economy", "5.0", "416.20"],
  ["FEDEX-F", "International Economy", "1.0", "219.40"],
  ["FEDEX-F", "International Economy", "2.0", "277.00"],
  ["FEDEX-F", "International Economy", "3.0", "331.60"],
  ["FEDEX-F", "International Economy", "5.0", "434.80"],
  ["FEDEX-C", "International Priority", "1.0", "163.00"],
  ["FEDEX-C", "International Priority", "2.0", "209.00"],
  ["FEDEX-C", "International Priority", "3.0", "264.30"],
  ["FEDEX-C", "International Priority", "5.0", "393.50"],
];

export const SHIPPING_RATES: readonly SeedShippingRate[] = FEDEX_TABLE.map(
  ([zoneCode, service, maxWeightKg, costUsd]) => ({
    zoneCode,
    carrier: "FEDEX",
    service,
    maxWeightKg,
    costUsd,
    validFrom: FEDEX_GT_2026_VALID_FROM,
    source: FEDEX_GT_2026,
  }),
);

// SUPUESTO (PRD §6.2): caja, burbuja y tarjeta sin cotizar todavía. El nombre lo dice para que se vea en el admin.
export const PACKAGING_PROFILE: SeedPackagingProfile = {
  name: "Estándar (supuesto)",
  innerLengthCm: "25.0",
  innerWidthCm: "20.0",
  innerHeightCm: "15.0",
  outerLengthCm: "30.0",
  outerWidthCm: "25.0",
  outerHeightCm: "20.0",
  packagingWeightGrams: 200,
  costGtq: "45.00",
};

// La pasarela (PayPal 5.40 % + US$0.30) y Shopify (2.0 % por proveedor externo) se guardan por separado:
// el 7.4 % del PRD es la suma de las dos.
export const COST_SETTINGS: SeedCostSettings = {
  fxUsdGtq: "7.6450", // verificado 13-oct-2026
  gatewayPct: "5.40",
  gatewayFixedUsd: "0.30",
  shopifyThirdPartyPct: "2.00",
  monthlyFixedUsd: "54.94",
  expectedUnitsPerMonth: 8, // SUPUESTO
  laborRateGtqPerHour: "25.00", // SUPUESTO
  targetMarginPct: "40.00",
  volumetricDivisor: 5000,
  usImportDutyPct: "10.00", // Sección 301, desde 24-jul-2026
};

// Las 4 del diseño de referencia. Sin precio ni producto de Shopify hasta que se fotografíen y se publiquen.
export const MASKS: readonly SeedMask[] = [
  {
    slug: "jaguar-dorado",
    nameEs: "Jaguar Dorado",
    nameEn: "Golden Jaguar",
    animal: "Jaguar",
    descriptionEs: "Máscara de jaguar tallada en madera y pintada a mano en tonos dorados. Texto provisional.",
    descriptionEn: "Wooden jaguar mask, hand-painted in golden tones. Placeholder text.",
    status: "DRAFT",
  },
  {
    slug: "lobo-florido",
    nameEs: "Lobo Florido",
    nameEn: "Flowered Wolf",
    animal: "Lobo",
    descriptionEs: "Máscara de lobo tallada en madera y pintada a mano con flores. Texto provisional.",
    descriptionEn: "Wooden wolf mask, hand-painted with flowers. Placeholder text.",
    status: "DRAFT",
  },
  {
    slug: "venado-rosa",
    nameEs: "Venado Rosa",
    nameEn: "Pink Deer",
    animal: "Venado",
    descriptionEs: "Máscara de venado tallada en madera y pintada a mano en tonos rosa. Texto provisional.",
    descriptionEn: "Wooden deer mask, hand-painted in pink tones. Placeholder text.",
    status: "DRAFT",
  },
  {
    slug: "cebra-magica",
    nameEs: "Cebra Mágica",
    nameEn: "Magic Zebra",
    animal: "Cebra",
    descriptionEs: "Máscara de cebra tallada en madera y pintada a mano. Texto provisional.",
    descriptionEn: "Wooden zebra mask, hand-painted. Placeholder text.",
    status: "DRAFT",
  },
];
