"use client";

import { type FormEvent, useState } from "react";
import type { AdminPackagingProfileDto } from "@sc-art-studio/shared";
import { useTranslations } from "next-intl";
import { useAdminSession } from "../AdminSessionProvider";
import { ADMIN_BUTTON, ADMIN_PANEL, ADMIN_PRIMARY_BUTTON } from "../styles";
import { Field, type FormNotice, Notice, NumberField, isInvalid, numberFrom, useProblemNotice } from "./formParts";

const NOTICE_ID = "caja-aviso";
// Topes del cotizador (bulto de courier): 274 cm por lado y 68 kg.
const MAX_SIDE_CM = 274;
const MAX_WEIGHT_GRAMS = 68_000;
const SIDES = ["Length", "Width", "Height"] as const;
const SIDE_LABEL = { Length: "length", Width: "width", Height: "height" } as const;

type DimensionName = `${"inner" | "outer"}${(typeof SIDES)[number]}Cm`;

interface BoxFormProps {
  /** null = caja nueva. */
  box: AdminPackagingProfileDto | null;
  onDone: (message: string) => void;
  onCancel: () => void;
}

export function BoxForm({ box, onDone, onCancel }: BoxFormProps) {
  const t = useTranslations("Admin.costs");
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dimensions = Object.fromEntries(
      (["inner", "outer"] as const).flatMap((part) =>
        SIDES.map((side) => {
          const name: DimensionName = `${part}${side}Cm`;
          return [name, numberFrom(form, name)];
        }),
      ),
    );
    const body = {
      name: String(form.get("name") ?? "").trim(),
      ...dimensions,
      packagingWeightGrams: numberFrom(form, "packagingWeightGrams"),
      costGtq: numberFrom(form, "costGtq"),
    };

    setIsSaving(true);
    setNotice(null);
    const result = await request(box ? `/api/admin/packaging-profiles/${box.id}` : "/api/admin/packaging-profiles", {
      method: box ? "PUT" : "POST",
      body,
    });
    setIsSaving(false);
    if (result.kind !== "ok") return setNotice(toNotice(result));
    onDone(t("boxes.saved"));
  }

  // Si la API rechaza las medidas, se marcan todas: no dice cuál de los seis lados falla.
  const isDimensionProblem = notice?.kind === "error" && notice.code === "INVALID_DIMENSIONS";

  return (
    <form onSubmit={onSubmit} aria-labelledby="caja-titulo" className={`${ADMIN_PANEL} flex flex-col gap-4`}>
      <h3 id="caja-titulo" className="font-display text-xl">
        {box ? t("boxes.editTitle") : t("boxes.newTitle")}
      </h3>
      <Field id="caja-nombre" label={t("boxes.fields.name")}>
        {(props) => (
          <input
            {...props}
            name="name"
            required
            maxLength={80}
            defaultValue={box?.name}
            aria-invalid={isInvalid(notice, "name") || undefined}
            aria-describedby={isInvalid(notice, "name") ? NOTICE_ID : undefined}
          />
        )}
      </Field>
      {(["inner", "outer"] as const).map((part) => (
        <fieldset key={part} className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-2 font-extrabold">{t(`boxes.${part}`)}</legend>
          {SIDES.map((side) => {
            const name: DimensionName = `${part}${side}Cm`;
            return (
              <NumberField
                key={name}
                id={`caja-${name}`}
                name={name}
                label={t(`boxes.fields.${SIDE_LABEL[side]}`)}
                step="0.1"
                min={0.1}
                max={MAX_SIDE_CM}
                defaultValue={box?.[name]}
                isInvalid={isDimensionProblem || isInvalid(notice, name)}
                describedBy={NOTICE_ID}
              />
            );
          })}
        </fieldset>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          id="caja-peso"
          name="packagingWeightGrams"
          label={t("boxes.fields.packagingWeightGrams")}
          step="1"
          max={MAX_WEIGHT_GRAMS}
          defaultValue={box?.packagingWeightGrams}
          isInvalid={isInvalid(notice, "packagingWeightGrams")}
          describedBy={NOTICE_ID}
        />
        <NumberField
          id="caja-costo"
          name="costGtq"
          label={t("boxes.fields.costGtq")}
          step="0.01"
          defaultValue={box?.costGtq}
          isInvalid={isInvalid(notice, "costGtq")}
          describedBy={NOTICE_ID}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isSaving} className={ADMIN_PRIMARY_BUTTON}>
          {isSaving ? t("settings.saving") : t("boxes.save")}
        </button>
        <button type="button" onClick={onCancel} className={ADMIN_BUTTON}>
          {t("cancel")}
        </button>
      </div>
      <Notice notice={notice} id={NOTICE_ID} />
    </form>
  );
}
