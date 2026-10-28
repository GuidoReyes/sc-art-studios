import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import type { AdminResult } from "@/lib/adminApi";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import { type FormNotice, Notice, NumberField, isInvalid, numberFrom, useProblemNotice } from "./formParts";

function render(node: ReactNode, locale: "es" | "en" = "es"): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en}>
      {node}
    </NextIntlClientProvider>,
  );
}

type Failure = Exclude<AdminResult<unknown>, { kind: "ok" }>;

/** Pinta lo que useProblemNotice devuelve para poder revisarlo. */
function ProblemProbe({ result }: { result: Failure }) {
  const notice = useProblemNotice()(result);
  return <output>{JSON.stringify(notice)}</output>;
}

const problemFor = (result: Failure, locale: "es" | "en" = "es"): FormNotice => {
  const html = render(<ProblemProbe result={result} />, locale);
  const json = html.replace(/^<output>|<\/output>$/g, "").replaceAll("&quot;", '"');
  return JSON.parse(json) as FormNotice;
};

describe("useProblemNotice", () => {
  it("traduce los códigos conocidos de la API y conserva el código", () => {
    expect(problemFor({ kind: "failed", status: 409, code: "STALE" })).toEqual({
      kind: "error",
      message: es.Admin.costs.errors.STALE,
      fields: [],
      code: "STALE",
    });
    expect(problemFor({ kind: "failed", status: 409, code: "IN_USE" }, "en").message).toBe(en.Admin.costs.errors.IN_USE);
  });

  it("un 400 sin código señala los campos; un código desconocido no se muestra crudo", () => {
    expect(problemFor({ kind: "failed", status: 400, fields: ["values.fxUsdGtq"] })).toEqual({
      kind: "error",
      message: es.Admin.costs.errors.invalid,
      fields: ["values.fxUsdGtq"],
    });
    expect(problemFor({ kind: "failed", status: 500, code: "ALGO_RARO" }).message).toBe(es.Admin.costs.errors.failed);
    expect(problemFor({ kind: "failed", status: 404 }).message).toBe(es.Admin.costs.errors.NOT_FOUND);
    expect(problemFor({ kind: "failed", status: 429 }).message).toBe(es.Admin.costs.errors.tooMany);
  });
});

describe("NumberField y Notice", () => {
  it("muestra la unidad y marca el campo inválido enlazado al aviso", () => {
    const html = render(
      <NumberField id="costo-gatewayPct" name="gatewayPct" label="Comisión" unit="%" step="0.01" max={100} defaultValue={5.4} isInvalid describedBy="aviso" />,
    );

    expect(html).toContain('for="costo-gatewayPct"');
    expect(html).toMatch(/aria-invalid="true"[^>]*aria-describedby="aviso"/);
    expect(html).toContain('value="5.4"');
    expect(html).toContain(">%</span>");
  });

  it("sin error no anuncia nada y el aviso queda en una región viva", () => {
    const html = render(
      <>
        <NumberField id="x" name="x" label="X" step="1" />
        <Notice notice={{ kind: "ok", message: "Guardado." }} id="aviso" />
      </>,
    );

    expect(html).not.toContain("aria-invalid=");
    expect(html).toMatch(/aria-live="polite" id="aviso"><p[^>]*>Guardado\.<\/p>/);
  });
});

describe("isInvalid y numberFrom", () => {
  it("solo marca los campos que la API señaló", () => {
    const notice: FormNotice = { kind: "error", message: "x", fields: ["values.gatewayPct"] };

    expect(isInvalid(notice, "values.gatewayPct")).toBe(true);
    expect(isInvalid(notice, "values.fxUsdGtq")).toBe(false);
    expect(isInvalid({ kind: "ok", message: "x" }, "values.gatewayPct")).toBe(false);
  });

  it("un campo vacío es NaN, no 0 (no se guarda un cero por accidente)", () => {
    const form = new FormData();
    form.set("fxUsdGtq", " 7.645 ");
    form.set("gatewayPct", "");

    expect(numberFrom(form, "fxUsdGtq")).toBe(7.645);
    expect(numberFrom(form, "gatewayPct")).toBeNaN();
  });
});
