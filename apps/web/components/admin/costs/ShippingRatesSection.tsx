"use client";

import { useState } from "react";
import type { AdminShippingRateDto, AdminShippingRateListResponse, AdminShippingZoneListResponse } from "@sc-art-studio/shared";
import { useLocale, useTranslations } from "next-intl";
import { asLocale } from "@/i18n/routing";
import { formatDate } from "@/lib/dates";
import { formatUsd } from "@/lib/price";
import { useAdminSession } from "../AdminSessionProvider";
import { ADMIN_BUTTON, ADMIN_INPUT } from "../styles";
import { useAdminData } from "../useAdminData";
import { DeleteButton, type FormNotice, LoadFailed, Notice, useProblemNotice } from "./formParts";
import { RateForm } from "./RateForm";

// El máximo que acepta la API por página: alcanza para todas las tarifas de una zona.
const RATES_LIMIT = 48;
const NOTICE_ID = "tarifas-aviso";

type Editing = { kind: "new" } | { kind: "edit"; rate: AdminShippingRateDto } | null;
type RateStatus = "current" | "expired" | "future";

function statusOf(rate: AdminShippingRateDto, now: Date): RateStatus {
  if (new Date(rate.validFrom) > now) return "future";
  if (rate.validTo && new Date(rate.validTo) <= now) return "expired";
  return "current";
}

/** La fuente como enlace https, o null si es texto ("cotización <fecha>"). */
function httpsUrl(source: string): URL | null {
  try {
    const url = new URL(source);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Un enlace muestra solo el dominio; el texto se muestra tal cual. */
function SourceText({ source }: { source: string }) {
  const url = httpsUrl(source);
  if (!url) return <>{source}</>;
  return (
    <a href={url.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-2 underline-offset-2">
      {url.hostname.replace(/^www\./, "")}
    </a>
  );
}

export function ShippingRatesSection() {
  const t = useTranslations("Admin.costs");
  const locale = asLocale(useLocale());
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const [zoneId, setZoneId] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const zones = useAdminData<AdminShippingZoneListResponse>("/api/admin/shipping-zones");
  const rates = useAdminData<AdminShippingRateListResponse>(
    `/api/admin/shipping-rates?limit=${RATES_LIMIT}${zoneId ? `&zoneId=${zoneId}` : ""}`,
  );

  if (zones.state.kind === "loading") return <p role="status">{t("loading")}</p>;
  if (zones.state.kind === "failed") return <LoadFailed onRetry={zones.reload} />;
  const zoneList = zones.state.data.data;
  const zoneName = new Map(zoneList.map((zone) => [zone.id, zone.code]));
  const now = new Date();

  function finish(message: string) {
    setEditing(null);
    setNotice({ kind: "ok", message });
    rates.reload();
  }

  async function remove(rate: AdminShippingRateDto) {
    const result = await request(`/api/admin/shipping-rates/${rate.id}`, { method: "DELETE" });
    if (result.kind !== "ok") return setNotice(toNotice(result));
    finish(t("rates.deleted"));
  }

  const rateLabel = (rate: AdminShippingRateDto) =>
    `${zoneName.get(rate.zoneId) ?? ""} ${rate.service} ${t("rates.kg", { value: rate.maxWeightKg })}`;

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl font-semibold">{t("rates.intro")}</p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="tarifas-zona" className="text-sm font-extrabold">
            {t("rates.zoneFilter")}
          </label>
          <select id="tarifas-zona" value={zoneId} onChange={(event) => setZoneId(event.target.value)} className={ADMIN_INPUT}>
            <option value="">{t("rates.allZones")}</option>
            {zoneList.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing({ kind: "new" })} className={ADMIN_BUTTON}>
            {t("rates.add")}
          </button>
        )}
      </div>

      {editing && (
        <RateForm
          key={editing.kind === "edit" ? editing.rate.id : "nueva"}
          zones={zoneList}
          rate={editing.kind === "edit" ? editing.rate : null}
          defaultZoneId={zoneId || undefined}
          onDone={finish}
          onCancel={() => setEditing(null)}
        />
      )}
      <Notice notice={editing ? null : notice} id={NOTICE_ID} />

      {rates.state.kind === "loading" && <p role="status">{t("loading")}</p>}
      {rates.state.kind === "failed" && <LoadFailed onRetry={rates.reload} />}
      {rates.state.kind === "ready" &&
        (rates.state.data.data.length === 0 ? (
          <p className="font-semibold">{t("rates.empty")}</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border-2 border-ink bg-white">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="border-b-2 border-ink">
                  <tr>
                    {(["zone", "carrier", "service", "maxWeightKg", "costUsd", "validity", "source", "actions"] as const).map((column) => (
                      <th key={column} scope="col" className="px-3 py-2 font-extrabold">
                        {t(`rates.columns.${column}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rates.state.data.data.map((rate) => {
                    const status = statusOf(rate, now);
                    const from = formatDate(rate.validFrom, locale);
                    return (
                      <tr key={rate.id} className={`border-t border-ink/20 ${status === "expired" ? "text-ink/70" : ""}`}>
                        <td className="px-3 py-2 font-extrabold">{zoneName.get(rate.zoneId) ?? "—"}</td>
                        <td className="px-3 py-2">{t(`rates.carriers.${rate.carrier}`)}</td>
                        <td className="px-3 py-2">
                          {rate.service}
                          {rate.isEstimate && (
                            <span className="ml-2 rounded-full bg-ink/10 px-2 text-xs font-extrabold">{t("rates.estimate")}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{t("rates.kg", { value: rate.maxWeightKg })}</td>
                        <td className="px-3 py-2 font-extrabold">{formatUsd(rate.costUsd)}</td>
                        <td className="px-3 py-2">
                          <span className="block font-extrabold">{t(`rates.status.${status}`)}</span>
                          {rate.validTo ? t("rates.until", { from, to: formatDate(rate.validTo, locale) }) : t("rates.open", { from })}
                        </td>
                        <td className="max-w-48 px-3 py-2 break-words">
                          <SourceText source={rate.source} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing({ kind: "edit", rate })}
                              aria-label={`${t("edit")}: ${rateLabel(rate)}`}
                              className={`${ADMIN_BUTTON} text-sm`}
                            >
                              {t("edit")}
                            </button>
                            <DeleteButton label={rateLabel(rate)} onConfirm={() => remove(rate)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rates.state.data.meta.total > rates.state.data.data.length && (
              <p className="text-sm font-semibold">
                {t("rates.more", { shown: rates.state.data.data.length, total: rates.state.data.meta.total })}
              </p>
            )}
          </>
        ))}
    </div>
  );
}
