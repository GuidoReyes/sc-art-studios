"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useLocale, useTranslations } from "next-intl";
import { countryOptions } from "@/lib/countries";
import {
  type CustomRequestField,
  type CustomRequestValues,
  EMPTY_VALUES,
  SIZE_OPTIONS,
  type SubmitResult,
  USE_OPTIONS,
  isoDay,
  latestDesiredDay,
  submitCustomRequest,
  validateCustomRequest,
} from "@/lib/customRequest";
import { ReferencePhotoInput } from "./ReferencePhotoInput";
import { WhatsAppButton } from "./WhatsAppButton";

// Clave pública del widget (no es secreta). Sin ella el formulario no se puede enviar.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

const CONTROL =
  "w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink aria-[invalid=true]:border-pink-deep aria-[invalid=true]:bg-pink/20";

type Status = { kind: "editing" } | { kind: "sending" } | Exclude<SubmitResult, { kind: "created" }> | { kind: "noToken" };

interface CustomRequestFormProps {
  /** Texto inicial de la idea, p. ej. cuando se llega desde "Quiero una parecida". */
  initialIdea?: string;
  whatsappNumber: string | undefined;
}

export function CustomRequestForm({ initialIdea = "", whatsappNumber }: CustomRequestFormProps) {
  const t = useTranslations("CustomForm");
  const locale = useLocale();
  const [values, setValues] = useState<CustomRequestValues>({ ...EMPTY_VALUES, idea: initialIdea });
  const [invalid, setInvalid] = useState<CustomRequestField[]>([]);
  const [reference, setReference] = useState<File | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "editing" });
  const [isDone, setIsDone] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const countries = useMemo(() => countryOptions(locale), [locale]);
  const today = useMemo(() => new Date(), []);
  const isSending = status.kind === "sending";

  useEffect(() => {
    if (isDone) doneRef.current?.focus();
  }, [isDone]);

  const set = (field: CustomRequestField) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setInvalid((current) => current.filter((name) => name !== field));
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCustomRequest(values);
    if (!validation.ok) {
      setInvalid(validation.invalid);
      setStatus({ kind: "editing" });
      formRef.current?.querySelector<HTMLElement>(`[name="${validation.invalid[0]}"]`)?.focus();
      return;
    }
    if (!token) {
      setStatus({ kind: "noToken" });
      return;
    }
    setStatus({ kind: "sending" });
    const result = await submitCustomRequest(validation.values, reference, token);
    if (result.kind === "created") {
      setIsDone(true);
      return;
    }
    // Cada token de Turnstile sirve una sola vez: se pide otro para el siguiente intento.
    setToken(null);
    turnstileRef.current?.reset();
    setStatus(result);
  }

  if (isDone) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border-4 border-ink bg-turquoise p-6 shadow-sticker-lg sm:p-8">
        <h2 ref={doneRef} tabIndex={-1} className="font-display text-4xl focus:outline-none">
          {t("done.title")}
        </h2>
        <p className="text-lg font-semibold">{t("done.body")}</p>
        <p className="font-extrabold">{t("adultReplies")}</p>
      </div>
    );
  }

  if (!TURNSTILE_SITE_KEY) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border-4 border-ink bg-cream p-6 shadow-sticker">
        <p className="text-lg font-extrabold">{t("unconfigured")}</p>
        <WhatsAppButton phone={whatsappNumber} message={t("whatsappMessage")} />
      </div>
    );
  }

  const fieldProps = (field: CustomRequestField) => ({
    id: `custom-${field}`,
    name: field,
    value: values[field],
    onChange: set(field),
    disabled: isSending,
    "aria-invalid": invalid.includes(field) ? true : undefined,
    "aria-describedby": invalid.includes(field) ? `custom-${field}-error` : undefined,
    className: CONTROL,
  });

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-6 rounded-card border-4 border-ink bg-cream p-5 shadow-sticker-lg sm:p-8"
    >
      <p className="font-extrabold">{t("adultReplies")}</p>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-2xl">{t("aboutYou")}</legend>
        <Field field="name" label={t("fields.name")} isInvalid={invalid.includes("name")} error={t("errors.name")}>
          <input {...fieldProps("name")} type="text" autoComplete="name" maxLength={120} required />
        </Field>
        <Field field="email" label={t("fields.email")} isInvalid={invalid.includes("email")} error={t("errors.email")}>
          <input {...fieldProps("email")} type="email" autoComplete="email" maxLength={254} required />
        </Field>
        <Field
          field="whatsapp"
          label={t("fields.whatsapp")}
          hint={t("hints.whatsapp")}
          isOptional
          isInvalid={invalid.includes("whatsapp")}
          error={t("errors.whatsapp")}
        >
          <input {...fieldProps("whatsapp")} type="tel" autoComplete="tel" inputMode="tel" maxLength={32} placeholder="+1 555 010 2030" />
        </Field>
        <Field field="country" label={t("fields.country")} isInvalid={invalid.includes("country")} error={t("errors.country")}>
          <select {...fieldProps("country")} autoComplete="country" required>
            <option value="">{t("choose")}</option>
            {countries.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-2xl">{t("aboutMask")}</legend>
        <div className="sm:col-span-2">
          <Field field="idea" label={t("fields.idea")} hint={t("hints.idea")} isInvalid={invalid.includes("idea")} error={t("errors.idea")}>
            <textarea {...fieldProps("idea")} rows={5} maxLength={2000} required />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field field="colors" label={t("fields.colors")} isOptional isInvalid={invalid.includes("colors")} error={t("errors.colors")}>
            <input {...fieldProps("colors")} type="text" maxLength={300} />
          </Field>
        </div>
        <Field field="size" label={t("fields.size")} isOptional isInvalid={invalid.includes("size")} error={t("errors.size")}>
          <select {...fieldProps("size")}>
            <option value="">{t("choose")}</option>
            {SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {t(`sizes.${size}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field field="use" label={t("fields.use")} isOptional isInvalid={invalid.includes("use")} error={t("errors.use")}>
          <select {...fieldProps("use")}>
            <option value="">{t("choose")}</option>
            {USE_OPTIONS.map((use) => (
              <option key={use} value={use}>
                {t(`uses.${use}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          field="desiredDate"
          label={t("fields.desiredDate")}
          hint={t("hints.desiredDate")}
          isOptional
          isInvalid={invalid.includes("desiredDate")}
          error={t("errors.desiredDate")}
        >
          <input {...fieldProps("desiredDate")} type="date" min={isoDay(today)} max={latestDesiredDay(today)} />
        </Field>
        <div className="sm:col-span-2">
          <ReferencePhotoInput file={reference} onChange={setReference} disabled={isSending} />
        </div>
      </fieldset>

      <Turnstile
        ref={turnstileRef}
        siteKey={TURNSTILE_SITE_KEY}
        onSuccess={setToken}
        onExpire={() => setToken(null)}
        onError={() => setToken(null)}
        options={{ language: locale, theme: "light", size: "flexible" }}
      />

      <div className="flex flex-col items-start gap-3">
        <button
          type="submit"
          disabled={isSending}
          className="rounded-full border-4 border-ink bg-purple px-8 py-3 text-lg font-extrabold text-cream shadow-sticker transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker-lg focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-70 motion-reduce:transition-none"
        >
          {isSending ? t("sending") : t("submit")}
        </button>
        <div aria-live="polite" className="font-extrabold">
          {invalid.length > 0 && <p className="text-pink-deep">{t("status.fix")}</p>}
          {status.kind !== "editing" && status.kind !== "sending" && <p className="text-pink-deep">{t(`status.${status.kind}`)}</p>}
        </div>
      </div>
    </form>
  );
}

interface FieldProps {
  field: CustomRequestField;
  label: string;
  hint?: string;
  error: string;
  isInvalid: boolean;
  isOptional?: boolean;
  children: ReactNode;
}

function Field({ field, label, hint, error, isInvalid, isOptional = false, children }: FieldProps) {
  const t = useTranslations("CustomForm");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`custom-${field}`} className="font-extrabold">
        {label} {isOptional && <span className="font-semibold">({t("optional")})</span>}
      </label>
      {hint && <p className="text-sm font-semibold">{hint}</p>}
      {children}
      {isInvalid && (
        <p id={`custom-${field}-error`} className="font-extrabold text-pink-deep">
          {error}
        </p>
      )}
    </div>
  );
}
