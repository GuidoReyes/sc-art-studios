// Contrato de /api/admin/cost-settings, /shipping-rates, /shipping-zones y /packaging-profiles (tarea 42).
// Solo tipos. Montos y medidas como número; % de 0 a 100 (5.40 = 5.40 %); fechas en ISO 8601.
import type { ListResponse } from "./content.js";
import type { AdminItemResponse } from "./admin.js";
import type { ShippingCarrier } from "./shipping.js";

/** Los parámetros del motor de costos (PRD §6) que el admin edita. */
export interface CostSettingsValues {
  fxUsdGtq: number;
  gatewayPct: number;
  gatewayFixedUsd: number;
  shopifyThirdPartyPct: number;
  monthlyFixedUsd: number;
  expectedUnitsPerMonth: number;
  laborRateGtqPerHour: number;
  targetMarginPct: number;
  volumetricDivisor: number;
  usImportDutyPct: number;
}

export type CostSettingsField = keyof CostSettingsValues;

/** Una versión de CostSettings: cada guardado crea una nueva. */
export interface CostSettingsVersionDto {
  id: number;
  values: CostSettingsValues;
  usImportDutyReviewedAt: string;
  updatedAt: string;
  /** Correo del admin que la guardó; null si fue el seed o el admin ya no existe. */
  updatedByEmail: string | null;
  /** Lo que cambió respecto a la versión anterior; null en la primera de todas. */
  changedFields: CostSettingsField[] | null;
}

export interface AdminCostSettingsDto {
  current: CostSettingsVersionDto;
  /** Las versiones anteriores más recientes, de la más nueva a la más vieja. */
  history: CostSettingsVersionDto[];
  dutyReview: {
    /** Cuándo vence la revisión del arancel de EE. UU. */
    dueAt: string;
    isDue: boolean;
  };
}

/** PUT /api/admin/cost-settings: guarda una versión nueva sobre `baseVersionId`. */
export interface CostSettingsSaveRequest {
  baseVersionId: number;
  values: CostSettingsValues;
  /** Confirma que el arancel se revisó aunque no haya cambiado. */
  dutyReviewed?: boolean;
}

export type AdminCostSettingsResponse = AdminItemResponse<AdminCostSettingsDto>;

export interface AdminShippingZoneDto {
  id: string;
  code: string;
  name: string;
  countries: string[];
}

export interface AdminShippingRateDto {
  id: string;
  carrier: ShippingCarrier;
  service: string;
  zoneId: string;
  maxWeightKg: number;
  costUsd: number;
  validFrom: string;
  /** null = sigue vigente. */
  validTo: string | null;
  /** URL o "cotización <fecha>". */
  source: string;
  isEstimate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPackagingProfileDto {
  id: string;
  name: string;
  innerLengthCm: number;
  innerWidthCm: number;
  innerHeightCm: number;
  outerLengthCm: number;
  outerWidthCm: number;
  outerHeightCm: number;
  packagingWeightGrams: number;
  costGtq: number;
  /** Máscaras que la usan: si hay alguna no se puede borrar. */
  maskCount: number;
}

export type AdminShippingZoneListResponse = AdminItemResponse<AdminShippingZoneDto[]>;
export type AdminShippingRateListResponse = ListResponse<AdminShippingRateDto>;
export type AdminPackagingProfileListResponse = ListResponse<AdminPackagingProfileDto>;
