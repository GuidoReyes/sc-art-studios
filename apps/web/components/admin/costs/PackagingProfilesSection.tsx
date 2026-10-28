"use client";

import { useState } from "react";
import type { AdminPackagingProfileDto, AdminPackagingProfileListResponse } from "@sc-art-studio/shared";
import { useTranslations } from "next-intl";
import { formatGtq } from "@/lib/price";
import { useAdminSession } from "../AdminSessionProvider";
import { ADMIN_BUTTON } from "../styles";
import { useAdminData } from "../useAdminData";
import { BoxForm } from "./BoxForm";
import { DeleteButton, type FormNotice, LoadFailed, Notice, useProblemNotice } from "./formParts";

// El máximo que acepta la API por página; el taller usa una o dos cajas.
const BOXES_LIMIT = 48;
const NOTICE_ID = "cajas-aviso";

type Editing = { kind: "new" } | { kind: "edit"; box: AdminPackagingProfileDto } | null;

export function PackagingProfilesSection() {
  const t = useTranslations("Admin.costs");
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const boxes = useAdminData<AdminPackagingProfileListResponse>(`/api/admin/packaging-profiles?limit=${BOXES_LIMIT}`);

  function finish(message: string) {
    setEditing(null);
    setNotice({ kind: "ok", message });
    boxes.reload();
  }

  async function remove(box: AdminPackagingProfileDto) {
    const result = await request(`/api/admin/packaging-profiles/${box.id}`, { method: "DELETE" });
    if (result.kind !== "ok") return setNotice(toNotice(result));
    finish(t("boxes.deleted"));
  }

  const size = (box: AdminPackagingProfileDto, part: "inner" | "outer") =>
    t("boxes.dimensions", { length: box[`${part}LengthCm`], width: box[`${part}WidthCm`], height: box[`${part}HeightCm`] });

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl font-semibold">{t("boxes.intro")}</p>
      {!editing && (
        <button type="button" onClick={() => setEditing({ kind: "new" })} className={`${ADMIN_BUTTON} self-start`}>
          {t("boxes.add")}
        </button>
      )}
      {editing && (
        <BoxForm
          key={editing.kind === "edit" ? editing.box.id : "nueva"}
          box={editing.kind === "edit" ? editing.box : null}
          onDone={finish}
          onCancel={() => setEditing(null)}
        />
      )}
      <Notice notice={editing ? null : notice} id={NOTICE_ID} />

      {boxes.state.kind === "loading" && <p role="status">{t("loading")}</p>}
      {boxes.state.kind === "failed" && <LoadFailed onRetry={boxes.reload} />}
      {boxes.state.kind === "ready" &&
        (boxes.state.data.data.length === 0 ? (
          <p className="font-semibold">{t("boxes.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-ink bg-white">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b-2 border-ink">
                <tr>
                  {(["name", "inner", "outer", "weight", "cost", "masks", "actions"] as const).map((column) => (
                    <th key={column} scope="col" className="px-3 py-2 font-extrabold">
                      {t(`boxes.columns.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {boxes.state.data.data.map((box) => (
                  <tr key={box.id} className="border-t border-ink/20">
                    <td className="px-3 py-2 font-extrabold">{box.name}</td>
                    <td className="px-3 py-2">{size(box, "inner")}</td>
                    <td className="px-3 py-2">{size(box, "outer")}</td>
                    <td className="px-3 py-2">{t("boxes.grams", { value: box.packagingWeightGrams })}</td>
                    <td className="px-3 py-2 font-extrabold">{formatGtq(box.costGtq)}</td>
                    <td className="px-3 py-2">{t("boxes.masks", { count: box.maskCount })}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing({ kind: "edit", box })}
                          aria-label={`${t("edit")}: ${box.name}`}
                          className={`${ADMIN_BUTTON} text-sm`}
                        >
                          {t("edit")}
                        </button>
                        {box.maskCount > 0 ? (
                          <span className="text-xs font-semibold">{t("boxes.inUse")}</span>
                        ) : (
                          <DeleteButton label={box.name} onConfirm={() => remove(box)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
