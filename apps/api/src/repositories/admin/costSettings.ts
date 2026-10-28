// CostSettings desde el admin (tarea 42). Versionada: guardar inserta una fila nueva (la vigente es la
// de id más alto) y su AuditLog en la misma transacción. El motor de precios lee siempre la vigente, así
// que un cambio se refleja en el precio sugerido de inmediato.
import type {
  CostSettingsField,
  CostSettingsSaveRequest,
  CostSettingsValues,
  CostSettingsVersionDto,
} from "@sc-art-studio/shared";
import type { CostSettings, Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpErrors.js";
import type { Actor } from "./store.js";

export const COST_SETTINGS_FIELDS = [
  "fxUsdGtq",
  "gatewayPct",
  "gatewayFixedUsd",
  "shopifyThirdPartyPct",
  "monthlyFixedUsd",
  "expectedUnitsPerMonth",
  "laborRateGtqPerHour",
  "targetMarginPct",
  "volumetricDivisor",
  "usImportDutyPct",
] as const satisfies readonly CostSettingsField[];

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CostSettingsOverview {
  current: CostSettingsVersionDto;
  history: CostSettingsVersionDto[];
}

export interface CostSettingsRepository {
  /** null si todavía no hay CostSettings (falta correr el seed). */
  overview(historyLimit: number): Promise<CostSettingsOverview | null>;
  /** HttpError 409 si otra persona guardó antes; 422 si no cambia nada. */
  save(input: CostSettingsSaveRequest, actor: Actor, now: Date): Promise<CostSettingsVersionDto>;
}

type Row = CostSettings & { updatedBy: { email: string } | null };

const num = (value: Prisma.Decimal | number): number => (typeof value === "number" ? value : value.toNumber());

export function valuesOf(row: CostSettings): CostSettingsValues {
  return Object.fromEntries(COST_SETTINGS_FIELDS.map((field) => [field, num(row[field])])) as unknown as CostSettingsValues;
}

/** Campos que cambian de `before` a `after`. */
export function changedSettings(before: CostSettingsValues, after: CostSettingsValues): CostSettingsField[] {
  return COST_SETTINGS_FIELDS.filter((field) => before[field] !== after[field]);
}

/** Cuándo vence la revisión del arancel y si ya venció. */
export function dutyReviewStatus(reviewedAt: Date, now: Date, days: number): { dueAt: Date; isDue: boolean } {
  const dueAt = new Date(reviewedAt.getTime() + days * DAY_MS);
  return { dueAt, isDue: now >= dueAt };
}

function toVersion(row: Row, previous: Row | undefined): CostSettingsVersionDto {
  const values = valuesOf(row);
  return {
    id: row.id,
    values,
    usImportDutyReviewedAt: row.usImportDutyReviewedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    updatedByEmail: row.updatedBy?.email ?? null,
    changedFields: previous ? changedSettings(valuesOf(previous), values) : null,
  };
}

const pick = (values: CostSettingsValues, fields: CostSettingsField[]) =>
  Object.fromEntries(fields.map((field) => [field, values[field]]));

// P2034 = la transacción chocó con otra (deadlock o conflicto de escritura) y MySQL la canceló.
const isWriteConflict = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2034";

const staleError = () =>
  new HttpError(409, "Otra persona cambió los costos mientras editabas. Recarga para ver la versión actual.", "STALE");

export function createPrismaCostSettingsRepository(prisma: PrismaClient): CostSettingsRepository {
  const include = { updatedBy: { select: { email: true } } } as const;

  return {
    async overview(historyLimit) {
      // Una fila extra para saber qué cambió en la más vieja que se muestra.
      const rows = await prisma.costSettings.findMany({ include, orderBy: { id: "desc" }, take: historyLimit + 2 });
      const [first] = rows;
      if (!first) return null;
      const versions = rows.slice(0, historyLimit + 1).map((row, index) => toVersion(row, rows[index + 1]));
      return { current: toVersion(first, rows[1]), history: versions.slice(1) };
    },

    async save({ baseVersionId, values, dutyReviewed = false }, actor, now) {
      try {
        // Serializable: dos guardados a la vez sobre la misma versión no pueden crear dos "vigentes".
        return await prisma.$transaction(
          async (tx) => {
            const latest = await tx.costSettings.findFirst({ include, orderBy: { id: "desc" } });
            if (!latest) throw new Error("No hay CostSettings: correr el seed");
            if (latest.id !== baseVersionId) throw staleError();

            const before = valuesOf(latest);
            const changed = changedSettings(before, values);
            if (changed.length === 0 && !dutyReviewed) throw new HttpError(422, "No hay nada que cambiar", "NO_CHANGES");
            const isDutyReviewed = dutyReviewed || changed.includes("usImportDutyPct");

            const created = await tx.costSettings.create({
              data: {
                ...values,
                usImportDutyReviewedAt: isDutyReviewed ? now : latest.usImportDutyReviewedAt,
                updatedAt: now,
                updatedById: actor.userId,
              },
              include,
            });
            await tx.auditLog.create({
              data: {
                userId: actor.userId,
                ip: actor.ip,
                action: "costSettings.update",
                entity: "CostSettings",
                entityId: String(created.id),
                diff: {
                  before: pick(before, changed),
                  after: pick(values, changed),
                  ...(isDutyReviewed ? { dutyReviewed: true } : {}),
                },
              },
            });
            return toVersion(created, latest);
          },
          { isolationLevel: "Serializable" },
        );
      } catch (error) {
        if (isWriteConflict(error)) throw staleError();
        throw error;
      }
    },
  };
}
