"use client";

import { type FormEvent, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatUsd } from "@/lib/price";
import { ESTIMATOR_COUNTRIES, type QuoteResult, requestShippingQuote } from "@/lib/shippingQuote";

const CARRIER_NAME = { FEDEX: "FedEx", POSTAL: "Postal", COURIER_LOCAL: "Courier", OTHER: "" } as const;

type State = { kind: "idle" } | { kind: "loading" } | QuoteResult;

/** Estimador de la ficha (PRD §6.4): el envío se muestra temprano para que no sorprenda en el checkout. */
export function ShippingEstimator({ maskId }: { maskId: string }) {
  const t = useTranslations("Shipping");
  const locale = useLocale();
  const selectId = useId();
  const [country, setCountry] = useState<string>(ESTIMATOR_COUNTRIES[0]);
  const [state, setState] = useState<State>({ kind: "idle" });

  const countryName = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "loading" });
    setState(await requestShippingQuote(maskId, country));
  }

  return (
    <section aria-labelledby={`${selectId}-title`} className="w-full rounded-card border-4 border-ink bg-turquoise p-5 shadow-sticker">
      <h2 id={`${selectId}-title`} className="font-display text-2xl">
        {t("title")}
      </h2>
      <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={selectId} className="font-extrabold">
            {t("country")}
          </label>
          <select
            id={selectId}
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="rounded-full border-[3px] border-ink bg-cream px-4 py-2 font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {ESTIMATOR_COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {countryName.of(code) ?? code}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={state.kind === "loading"}
          className="rounded-full border-4 border-ink bg-ink px-5 py-2 font-extrabold text-cream focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-70"
        >
          {state.kind === "loading" ? t("loading") : t("submit")}
        </button>
      </form>

      <div aria-live="polite" className="mt-4">
        {state.kind === "quote" &&
          (state.quote.options.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {state.quote.options.map((option) => (
                <li
                  key={`${option.carrier}-${option.service}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border-[3px] border-ink bg-cream px-4 py-2"
                >
                  <span className="font-extrabold">
                    {CARRIER_NAME[option.carrier]} {option.service}
                  </span>
                  <span className="font-display text-xl">
                    {formatUsd(option.chargeUsd)}
                    {option.isEstimate && <span className="ml-1 font-body text-sm font-extrabold">{t("estimate")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-extrabold">{t("notYet")}</p>
          ))}
        {state.kind === "incomplete" && <p className="font-extrabold">{t("incomplete")}</p>}
        {state.kind === "rateLimited" && <p className="font-extrabold">{t("rateLimited")}</p>}
        {state.kind === "failed" && <p className="font-extrabold">{t("failed")}</p>}
      </div>

      <p className="mt-4 text-sm font-semibold">
        {t("duties")}{" "}
        <Link href="/shipping" className="font-extrabold underline underline-offset-4">
          {t("more")}
        </Link>
      </p>
    </section>
  );
}
