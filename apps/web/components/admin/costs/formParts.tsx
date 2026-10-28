"use client";

// Piezas que comparten los tres formularios de Costos y envíos.
import { type ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import type { AdminResult } from "@/lib/adminApi";
import { ADMIN_BUTTON, ADMIN_INPUT } from "../styles";

/** Lo que se muestra debajo de un formulario después de guardar. */
export type FormNotice = { kind: "ok"; message: string } | { kind: "error"; message: string; fields: string[]; code?: string };

const KNOWN_CODES = [
  "STALE",
  "NO_CHANGES",
  "IN_USE",
  "INVALID_PERIOD",
  "INVALID_DIMENSIONS",
  "DUPLICATE",
  "INVALID_REFERENCE",
] as const;
type KnownCode = (typeof KNOWN_CODES)[number];

const isKnownCode = (code: string | undefined): code is KnownCode => KNOWN_CODES.some((known) => known === code);

/** Traduce un rechazo de la API: por código, por campos inválidos o, si no, un error genérico. */
export function useProblemNotice() {
  const t = useTranslations("Admin.costs.errors");
  return (result: Exclude<AdminResult<unknown>, { kind: "ok" }>): FormNotice => {
    if (result.kind === "unauthenticated") return { kind: "error", message: t("failed"), fields: [] };
    const fields = result.fields ?? [];
    if (isKnownCode(result.code)) return { kind: "error", message: t(result.code), fields, code: result.code };
    if (result.status === 404) return { kind: "error", message: t("NOT_FOUND"), fields };
    if (result.status === 429) return { kind: "error", message: t("tooMany"), fields };
    if (result.status === 400) return { kind: "error", message: t("invalid"), fields };
    return { kind: "error", message: t("failed"), fields };
  };
}

export const isInvalid = (notice: FormNotice | null, ...paths: string[]) =>
  notice?.kind === "error" && notice.fields.some((field) => paths.includes(field));

export function Notice({ notice, id }: { notice: FormNotice | null; id: string }) {
  return (
    <div aria-live="polite" id={id}>
      {notice && (
        <p className={`font-extrabold ${notice.kind === "ok" ? "text-purple" : "text-pink-deep"}`}>{notice.message}</p>
      )}
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  unit?: string;
  children: (props: { id: string; className: string }) => ReactNode;
}

/** Etiqueta encima y la unidad al lado del campo, para que se lea "Q 25.00" y no solo "25". */
export function Field({ id, label, unit, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-extrabold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {children({ id, className: ADMIN_INPUT })}
        {unit && <span className="min-w-12 shrink-0 text-sm font-semibold">{unit}</span>}
      </div>
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  name: string;
  label: string;
  unit?: string;
  step: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  isInvalid?: boolean;
  describedBy?: string;
}

export function NumberField({ id, name, label, unit, step, min = 0, max, defaultValue, isInvalid, describedBy }: NumberFieldProps) {
  return (
    <Field id={id} label={label} unit={unit}>
      {(props) => (
        <input
          {...props}
          name={name}
          type="number"
          inputMode="decimal"
          required
          step={step}
          min={min}
          max={max}
          defaultValue={defaultValue}
          aria-invalid={isInvalid || undefined}
          aria-describedby={isInvalid ? describedBy : undefined}
        />
      )}
    </Field>
  );
}

/** Número de un campo del formulario; NaN si quedó vacío (lo frena `required` antes de enviar). */
export const numberFrom = (form: FormData, name: string) => {
  const raw = String(form.get(name) ?? "").trim();
  return raw === "" ? Number.NaN : Number(raw);
};

/** Borrar pide una segunda confirmación en la misma fila (sin `confirm()`, que bloquea la página). */
export function DeleteButton({ onConfirm, label }: { onConfirm: () => Promise<void>; label: string }) {
  const t = useTranslations("Admin.costs");
  const [isAsking, setIsAsking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isAsking) {
    return (
      <button type="button" onClick={() => setIsAsking(true)} className={`${ADMIN_BUTTON} text-sm`} aria-label={`${t("delete")}: ${label}`}>
        {t("delete")}
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2" role="group" aria-label={`${t("confirmDelete")} ${label}`}>
      <span className="text-sm font-extrabold">{t("confirmDelete")}</span>
      <button
        type="button"
        disabled={isDeleting}
        onClick={async () => {
          setIsDeleting(true);
          await onConfirm();
          setIsDeleting(false);
          setIsAsking(false);
        }}
        className={`${ADMIN_BUTTON} bg-pink-deep text-sm text-cream`}
      >
        {t("confirmYes")}
      </button>
      <button type="button" onClick={() => setIsAsking(false)} className={`${ADMIN_BUTTON} text-sm`}>
        {t("cancel")}
      </button>
    </span>
  );
}

export function LoadFailed({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("Admin.costs");
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="font-extrabold">{t("failed")}</p>
      <button type="button" onClick={onRetry} className={ADMIN_BUTTON}>
        {t("retry")}
      </button>
    </div>
  );
}
