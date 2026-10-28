"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { AdminDashboardDto, AdminDashboardResponse } from "@sc-art-studio/shared";
import { useLocale, useTranslations } from "next-intl";
import { asLocale } from "@/i18n/routing";
import { formatDate } from "@/lib/dates";
import { formatUsd } from "@/lib/price";
import { useAdminSession } from "./AdminSessionProvider";
import { ADMIN_BUTTON } from "./AdminShell";

type State = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; data: AdminDashboardDto };

const total = (counts: Record<string, number>) => Object.values(counts).reduce((sum, count) => sum + count, 0);

export function AdminDashboard() {
  const t = useTranslations("Admin.dashboard");
  const locale = asLocale(useLocale());
  const { request } = useAdminSession();
  const [state, setState] = useState<State>({ kind: "loading" });

  // Cada reintento sube `attempt` y vuelve a correr el efecto.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    void request<AdminDashboardResponse>("/api/admin/dashboard").then((result) => {
      if (!isCurrent) return;
      // Sin sesión, AdminShell ya está mandando al login.
      if (result.kind === "ok") setState({ kind: "ready", data: result.data.data });
      else if (result.kind === "failed") setState({ kind: "failed" });
    });
    return () => {
      isCurrent = false;
    };
  }, [request, attempt]);

  function retry() {
    setState({ kind: "loading" });
    setAttempt((current) => current + 1);
  }

  const regionName = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <h1 className="font-display text-4xl">{t("title")}</h1>

      {state.kind === "loading" && <p role="status">{t("loading")}</p>}
      {state.kind === "failed" && (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="font-extrabold">{t("failed")}</p>
          <button type="button" onClick={retry} className={ADMIN_BUTTON}>
            {t("retry")}
          </button>
        </div>
      )}

      {state.kind === "ready" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title={t("masks")} headline={t("masksTotal", { count: total(state.data.masksByStatus) })}>
              <Breakdown counts={state.data.masksByStatus} label={(status) => t(`masksByStatus.${status}`)} />
            </Card>
            <Card
              title={t("requests")}
              headline={t("requestsPending", { count: state.data.customRequestsByStatus.NEW })}
              isHighlighted={state.data.customRequestsByStatus.NEW > 0}
            >
              <Breakdown counts={state.data.customRequestsByStatus} label={(status) => t(`requestsByStatus.${status}`)} />
            </Card>
            <Card title={t("orders")} headline={t("ordersCount", { count: state.data.orders.count })}>
              <p className="font-semibold">
                {t("ordersTotal")}: <span className="font-extrabold">{formatUsd(state.data.orders.totalUsd)}</span>
              </p>
            </Card>
          </div>

          <section aria-labelledby="ultimas-ventas" className="flex flex-col gap-3">
            <h2 id="ultimas-ventas" className="font-display text-2xl">
              {t("latest")}
            </h2>
            {state.data.orders.latest.length === 0 ? (
              <p className="font-semibold">{t("noOrders")}</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border-2 border-ink bg-white">
                <table className="w-full min-w-[36rem] text-left">
                  <thead className="border-b-2 border-ink">
                    <tr>
                      {(["mask", "total", "country", "status", "date"] as const).map((column) => (
                        <th key={column} scope="col" className="px-4 py-2 font-extrabold">
                          {t(`columns.${column}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.orders.latest.map((order) => (
                      <tr key={order.id} className="border-t border-ink/20">
                        <td className="px-4 py-2 font-semibold">{order.maskName?.[locale] ?? t("unknownMask")}</td>
                        <td className="px-4 py-2">{formatUsd(order.totalUsd)}</td>
                        <td className="px-4 py-2">
                          {order.shippingCountry ? (regionName.of(order.shippingCountry) ?? order.shippingCountry) : "—"}
                        </td>
                        <td className="px-4 py-2">{order.status}</td>
                        <td className="px-4 py-2">{formatDate(order.createdAt, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

interface CardProps {
  title: string;
  headline: string;
  isHighlighted?: boolean;
  children: ReactNode;
}

function Card({ title, headline, isHighlighted = false, children }: CardProps) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-3 rounded-2xl border-2 border-ink p-5 ${isHighlighted ? "bg-orange" : "bg-white"}`}
    >
      <h2 className="text-sm font-extrabold tracking-wide uppercase">{title}</h2>
      <p className="font-display text-2xl">{headline}</p>
      {children}
    </section>
  );
}

function Breakdown<S extends string>({ counts, label }: { counts: Record<S, number>; label: (status: S) => string }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      {(Object.entries(counts) as [S, number][]).map(([status, count]) => (
        <div key={status} className="contents">
          <dt className="font-semibold">{label(status)}</dt>
          <dd className="text-right font-extrabold">{count}</dd>
        </div>
      ))}
    </dl>
  );
}
