"use client";

import { type FormEvent, useState } from "react";
import type { AdminShippingRateDto, AdminShippingZoneDto, ShippingCarrier } from "@sc-art-studio/shared";
import { useTranslations } from "next-intl";
import { useAdminSession } from "../AdminSessionProvider";
import { ADMIN_BUTTON, ADMIN_PANEL, ADMIN_PRIMARY_BUTTON } from "../styles";
import { Field, type FormNotice, Notice, NumberField, isInvalid, numberFrom, useProblemNotice } from "./formParts";

export const CARRIERS: readonly ShippingCarrier[] = ["FEDEX", "POSTAL", "COURIER_LOCAL", "OTHER"];
const NOTICE_ID = "tarifa-aviso";
const MAX_WEIGHT_KG = 68;

/** "2026-01-05T00:00:00.000Z" → "2026-01-05" para <input type="date">. */
const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
/** Las vigencias empiezan a medianoche UTC, igual que las del seed. */
const fromDateInput = (value: string) => `${value}T00:00:00.000Z`;

interface RateFormProps {
  zones: AdminShippingZoneDto[];
  /** null = tarifa nueva. */
  rate: AdminShippingRateDto | null;
  defaultZoneId?: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}

export function RateForm({ zones, rate, defaultZoneId, onDone, onCancel }: RateFormProps) {
  const t = useTranslations("Admin.costs");
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const validTo = String(form.get("validTo") ?? "");
    const body = {
      zoneId: String(form.get("zoneId")),
      carrier: String(form.get("carrier")),
      service: String(form.get("service") ?? "").trim(),
      maxWeightKg: numberFrom(form, "maxWeightKg"),
      costUsd: numberFrom(form, "costUsd"),
      validFrom: fromDateInput(String(form.get("validFrom"))),
      validTo: validTo ? fromDateInput(validTo) : null,
      source: String(form.get("source") ?? "").trim(),
      isEstimate: form.get("isEstimate") === "on",
    };

    setIsSaving(true);
    setNotice(null);
    const result = await request(rate ? `/api/admin/shipping-rates/${rate.id}` : "/api/admin/shipping-rates", {
      method: rate ? "PUT" : "POST",
      body,
    });
    setIsSaving(false);
    if (result.kind !== "ok") return setNotice(toNotice(result));
    onDone(t("rates.saved"));
  }

  const invalid = (name: string) => isInvalid(notice, name) || undefined;
  const describedBy = (name: string) => (invalid(name) ? NOTICE_ID : undefined);

  return (
    <form onSubmit={onSubmit} aria-labelledby="tarifa-titulo" className={`${ADMIN_PANEL} flex flex-col gap-4`}>
      <h3 id="tarifa-titulo" className="font-display text-xl">
        {rate ? t("rates.editTitle") : t("rates.newTitle")}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tarifa-zona" label={t("rates.fields.zoneId")}>
          {(props) => (
            <select {...props} name="zoneId" required defaultValue={rate?.zoneId ?? defaultZoneId ?? zones[0]?.id}>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="tarifa-transportista" label={t("rates.fields.carrier")}>
          {(props) => (
            <select {...props} name="carrier" required defaultValue={rate?.carrier ?? "FEDEX"}>
              {CARRIERS.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {t(`rates.carriers.${carrier}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="tarifa-servicio" label={t("rates.fields.service")}>
          {(props) => (
            <input
              {...props}
              name="service"
              required
              maxLength={80}
              defaultValue={rate?.service}
              aria-invalid={invalid("service")}
              aria-describedby={describedBy("service")}
            />
          )}
        </Field>
        <NumberField
          id="tarifa-peso"
          name="maxWeightKg"
          label={t("rates.fields.maxWeightKg")}
          step="0.01"
          min={0.01}
          max={MAX_WEIGHT_KG}
          defaultValue={rate?.maxWeightKg}
          isInvalid={invalid("maxWeightKg")}
          describedBy={NOTICE_ID}
        />
        <NumberField
          id="tarifa-costo"
          name="costUsd"
          label={t("rates.fields.costUsd")}
          step="0.01"
          defaultValue={rate?.costUsd}
          isInvalid={invalid("costUsd")}
          describedBy={NOTICE_ID}
        />
        <Field id="tarifa-desde" label={t("rates.fields.validFrom")}>
          {(props) => (
            <input
              {...props}
              name="validFrom"
              type="date"
              required
              defaultValue={toDateInput(rate?.validFrom)}
              aria-invalid={invalid("validFrom")}
              aria-describedby={describedBy("validFrom")}
            />
          )}
        </Field>
        <Field id="tarifa-hasta" label={t("rates.fields.validTo")}>
          {(props) => (
            <input
              {...props}
              name="validTo"
              type="date"
              defaultValue={toDateInput(rate?.validTo)}
              aria-invalid={invalid("validTo")}
              aria-describedby={describedBy("validTo")}
            />
          )}
        </Field>
        <Field id="tarifa-fuente" label={t("rates.fields.source")}>
          {(props) => (
            <input
              {...props}
              name="source"
              required
              maxLength={500}
              defaultValue={rate?.source}
              aria-invalid={invalid("source")}
              aria-describedby={describedBy("source")}
            />
          )}
        </Field>
      </div>
      <label className="flex items-start gap-3 font-semibold">
        <input type="checkbox" name="isEstimate" defaultChecked={rate?.isEstimate ?? true} className="mt-1 size-5 shrink-0 accent-purple" />
        {t("rates.fields.isEstimate")}
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isSaving} className={ADMIN_PRIMARY_BUTTON}>
          {isSaving ? t("settings.saving") : t("rates.save")}
        </button>
        <button type="button" onClick={onCancel} className={ADMIN_BUTTON}>
          {t("cancel")}
        </button>
      </div>
      <Notice notice={notice} id={NOTICE_ID} />
    </form>
  );
}
