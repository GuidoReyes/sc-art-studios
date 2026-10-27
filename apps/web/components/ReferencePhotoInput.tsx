"use client";

import { type ChangeEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { REFERENCE_TYPES, type ReferenceProblem, checkReference } from "@/lib/customRequest";

interface ReferencePhotoInputProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

/** Foto de referencia opcional con vista previa local (no sale del navegador hasta enviar). */
export function ReferencePhotoInput({ file, onChange, disabled = false }: ReferencePhotoInputProps) {
  const t = useTranslations("CustomForm.photo");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<ReferenceProblem | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function onSelect(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    const found = selected ? checkReference(selected) : null;
    setProblem(found);
    onChange(found ? null : selected);
    if (found) event.target.value = "";
  }

  function onRemove() {
    setProblem(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="font-extrabold">
        {t("label")} <span className="font-semibold">({t("optional")})</span>
      </label>
      <p id={`${inputId}-hint`} className="text-sm font-semibold">
        {t("hint")}
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={REFERENCE_TYPES.join(",")}
        onChange={onSelect}
        disabled={disabled}
        aria-describedby={`${inputId}-hint${problem ? ` ${inputId}-error` : ""}`}
        aria-invalid={problem ? true : undefined}
        className="w-full rounded-2xl border-[3px] border-dashed border-ink bg-cream px-4 py-3 font-semibold file:mr-4 file:rounded-full file:border-[3px] file:border-ink file:bg-turquoise file:px-4 file:py-1 file:font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
      {problem && (
        <p id={`${inputId}-error`} className="font-extrabold text-pink-deep">
          {t(problem === "type" ? "errorType" : "errorSize")}
        </p>
      )}
      {previewUrl && file && (
        <div className="flex items-center gap-4 rounded-2xl border-[3px] border-ink bg-cream p-3">
          {/* Vista previa local (blob:), por eso no usa next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={t("previewAlt")} className="size-20 rounded-xl border-[3px] border-ink object-cover" />
          <div className="flex min-w-0 flex-col items-start gap-1">
            <span className="max-w-full truncate font-extrabold">{file.name}</span>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="font-extrabold underline decoration-4 underline-offset-4 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {t("remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
