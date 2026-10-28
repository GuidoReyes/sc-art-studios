"use client";

import { type FormEvent, useState } from "react";
import type {
  AdminCostSettingsDto,
  AdminCostSettingsResponse,
  CostSettingsField,
  CostSettingsSaveRequest,
  CostSettingsValues,
  CostSettingsVersionDto,
} from "@sc-art-studio/shared";
import { useLocale, useTranslations } from "next-intl";
import { asLocale } from "@/i18n/routing";
import { formatDate } from "@/lib/dates";
import { useAdminSession } from "../AdminSessionProvider";
import { ADMIN_BUTTON, ADMIN_PANEL, ADMIN_PRIMARY_BUTTON } from "../styles";
import { useAdminData } from "../useAdminData";
import { type FormNotice, LoadFailed, Notice, NumberField, isInvalid, numberFrom, useProblemNotice } from "./formParts";

const PATH = "/api/admin/cost-settings";
const NOTICE_ID = "costos-aviso";
const HUNDRED = 100;

// Mismos topes y decimales que las columnas de CostSettings (la API vuelve a validar).
interface FieldSpec {
  name: CostSettingsField;
  step: string;
  min?: number;
  max?: number;
}

const pct = (name: CostSettingsField): FieldSpec => ({ name, step: "0.01", max: HUNDRED });

const GROUPS: { key: "fx" | "fees" | "fixed" | "pricing" | "shipping"; fields: FieldSpec[] }[] = [
  { key: "fx", fields: [{ name: "fxUsdGtq", step: "0.0001", min: 0.0001 }] },
  { key: "fees", fields: [pct("gatewayPct"), { name: "gatewayFixedUsd", step: "0.01" }, pct("shopifyThirdPartyPct")] },
  {
    key: "fixed",
    fields: [
      { name: "monthlyFixedUsd", step: "0.01" },
      { name: "expectedUnitsPerMonth", step: "1", min: 1 },
      { name: "laborRateGtqPerHour", step: "0.01" },
    ],
  },
  { key: "pricing", fields: [pct("targetMarginPct")] },
  { key: "shipping", fields: [{ name: "volumetricDivisor", step: "1", min: 1 }, pct("usImportDutyPct")] },
];

const FIELD_NAMES = GROUPS.flatMap((group) => group.fields.map((field) => field.name));

function valuesFrom(form: FormData): CostSettingsValues {
  return Object.fromEntries(FIELD_NAMES.map((name) => [name, numberFrom(form, name)])) as unknown as CostSettingsValues;
}

/** Mismo límite que el motor de precios: con comisiones + margen ≥ 100 % no hay precio posible. */
const isReachable = (values: CostSettingsValues) =>
  values.gatewayPct + values.shopifyThirdPartyPct + values.targetMarginPct < HUNDRED;

export function CostSettingsSection() {
  const t = useTranslations("Admin.costs");
  const { state, reload } = useAdminData<AdminCostSettingsResponse>(PATH);
  // Vive aquí y no en el formulario: "Guardado" debe seguir visible cuando se recarga con la versión nueva.
  const [notice, setNotice] = useState<FormNotice | null>(null);

  if (state.kind === "loading") return <p role="status">{t("loading")}</p>;
  if (state.kind === "failed") return <LoadFailed onRetry={reload} />;
  return (
    <CostSettingsForm
      // Cada versión nueva vuelve a montar el formulario con sus valores.
      key={state.data.data.current.id}
      overview={state.data.data}
      notice={notice}
      onNotice={setNotice}
      onReload={reload}
    />
  );
}

interface FormProps {
  overview: AdminCostSettingsDto;
  notice: FormNotice | null;
  onNotice: (notice: FormNotice | null) => void;
  onReload: () => void;
}

function CostSettingsForm({ overview, notice, onNotice, onReload }: FormProps) {
  const t = useTranslations("Admin.costs");
  const locale = asLocale(useLocale());
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const [isSaving, setIsSaving] = useState(false);
  const { current, history, dutyReview } = overview;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = valuesFrom(form);
    if (!isReachable(values)) {
      return onNotice({ kind: "error", message: t("errors.margin"), fields: ["values.targetMarginPct"] });
    }
    const body: CostSettingsSaveRequest = { baseVersionId: current.id, values, dutyReviewed: form.get("dutyReviewed") === "on" };

    setIsSaving(true);
    onNotice(null);
    const result = await request(PATH, { method: "PUT", body });
    setIsSaving(false);
    if (result.kind !== "ok") return onNotice(toNotice(result));
    onNotice({ kind: "ok", message: t("settings.saved") });
    onReload();
  }

  const isStale = notice?.kind === "error" && notice.code === "STALE";

  return (
    <div className="flex flex-col gap-6">
      <DutyBanner reviewedAt={current.usImportDutyReviewedAt} dueAt={dutyReview.dueAt} isDue={dutyReview.isDue} />

      <form onSubmit={onSubmit} aria-describedby={NOTICE_ID} className={`${ADMIN_PANEL} flex flex-col gap-6`}>
        <p className="text-sm font-semibold">
          {t("settings.current", {
            id: current.id,
            date: formatDate(current.updatedAt, locale),
            by: current.updatedByEmail ?? t("settings.seed"),
          })}
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {GROUPS.map((group) => (
            <fieldset key={group.key} className="flex min-w-0 flex-col gap-3">
              <legend className="mb-2 font-display text-xl">{t(`settings.groups.${group.key}`)}</legend>
              {group.fields.map(({ name, ...spec }) => (
                <NumberField
                  key={name}
                  id={`costo-${name}`}
                  name={name}
                  label={t(`settings.fields.${name}`)}
                  unit={t(`settings.units.${name}`)}
                  defaultValue={current.values[name]}
                  isInvalid={isInvalid(notice, `values.${name}`)}
                  describedBy={NOTICE_ID}
                  {...spec}
                />
              ))}
            </fieldset>
          ))}
        </div>
        <label className="flex items-start gap-3 font-semibold">
          <input type="checkbox" name="dutyReviewed" className="mt-1 size-5 shrink-0 accent-purple" />
          {t("settings.dutyReviewed")}
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={isSaving} className={ADMIN_PRIMARY_BUTTON}>
            {isSaving ? t("settings.saving") : t("settings.save")}
          </button>
          {isStale && (
            <button type="button" onClick={onReload} className={ADMIN_BUTTON}>
              {t("retry")}
            </button>
          )}
        </div>
        <Notice notice={notice} id={NOTICE_ID} />
      </form>

      <History versions={history} />
    </div>
  );
}

function DutyBanner({ reviewedAt, dueAt, isDue }: { reviewedAt: string; dueAt: string; isDue: boolean }) {
  const t = useTranslations("Admin.costs.duty");
  const locale = asLocale(useLocale());
  const date = formatDate(reviewedAt, locale);
  if (!isDue) return <p className="text-sm font-semibold">{t("ok", { date, due: formatDate(dueAt, locale) })}</p>;
  return (
    <p role="alert" className="rounded-2xl border-2 border-ink bg-orange p-4 font-extrabold">
      {t("due", { date })}
    </p>
  );
}

function History({ versions }: { versions: CostSettingsVersionDto[] }) {
  const t = useTranslations("Admin.costs.settings");
  const locale = asLocale(useLocale());
  const changes = ({ changedFields }: CostSettingsVersionDto) => {
    if (changedFields === null) return t("first");
    if (changedFields.length === 0) return t("unchanged");
    return t("changed", { fields: changedFields.map((field) => t(`fields.${field}`)).join(", ") });
  };

  return (
    <details className={ADMIN_PANEL}>
      <summary className="cursor-pointer font-display text-xl">{t("history")}</summary>
      {versions.length === 0 ? (
        <p className="mt-3 font-semibold">{t("historyEmpty")}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {versions.map((version) => (
            <li key={version.id} className="border-t border-ink/20 pt-3">
              <p className="font-extrabold">
                {t("version", {
                  id: version.id,
                  date: formatDate(version.updatedAt, locale),
                  by: version.updatedByEmail ?? t("seed"),
                })}
              </p>
              <p className="text-sm font-semibold">{changes(version)}</p>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
