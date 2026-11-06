"use client";

import { type FormEvent, useRef, useState } from "react";
import type { AdminStoryDto, AdminStoryListResponse } from "@sc-art-studio/shared";
import { useTranslations } from "next-intl";
import { useAdminSession } from "../AdminSessionProvider";
import { DeleteButton, type FormNotice, LoadFailed, Notice, useProblemNotice } from "../costs/formParts";
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_PANEL, ADMIN_PRIMARY_BUTTON } from "../styles";
import { useAdminData } from "../useAdminData";
import { SelectField } from "./AdminVideos";
import { OPTIONS_PAGE_LIMIT, useMaskOptions } from "./options";
import { wrapSelection } from "./richText";

type Editing = { kind: "new" } | { kind: "edit"; story: AdminStoryDto } | null;

/** Historias (tarea 41): texto bilingüe con formato básico; la API lo sanitiza al guardar. */
export function AdminStories() {
  const t = useTranslations("Admin.stories");
  const tc = useTranslations("Admin.costs");
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const masks = useMaskOptions();
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const stories = useAdminData<AdminStoryListResponse>(`/api/admin/stories?limit=${OPTIONS_PAGE_LIMIT}`);
  const maskName = (id: string | null) => masks.find((mask) => mask.id === id)?.label ?? "—";

  async function remove(story: AdminStoryDto) {
    const result = await request(`/api/admin/stories/${story.id}`, { method: "DELETE" });
    if (result.kind !== "ok") return setNotice(toNotice(result));
    setNotice({ kind: "ok", message: t("deleted") });
    stories.reload();
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl">{t("title")}</h1>
        <p className="max-w-3xl font-semibold">{t("intro")}</p>
      </header>
      {editing ? (
        <StoryForm
          key={editing.kind === "edit" ? editing.story.id : "nueva"}
          story={editing.kind === "edit" ? editing.story : null}
          masks={masks}
          onCancel={() => setEditing(null)}
          onSaved={(story, message) => {
            setEditing({ kind: "edit", story });
            setNotice({ kind: "ok", message });
            stories.reload();
          }}
        />
      ) : (
        <button type="button" className={`${ADMIN_BUTTON} self-start`} onClick={() => setEditing({ kind: "new" })}>
          {t("add")}
        </button>
      )}
      <Notice notice={notice} id="historias-aviso" />

      {stories.state.kind === "loading" && <p role="status">{tc("loading")}</p>}
      {stories.state.kind === "failed" && <LoadFailed onRetry={stories.reload} />}
      {stories.state.kind === "ready" &&
        (stories.state.data.data.length === 0 ? (
          <p className="font-semibold">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-ink bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b-2 border-ink">
                <tr>
                  {(["title", "mask", "status", "actions"] as const).map((column) => (
                    <th key={column} scope="col" className="px-3 py-2 font-extrabold">
                      {t(`columns.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stories.state.data.data.map((story) => (
                  <tr key={story.id} className="border-t border-ink/20">
                    <td className="px-3 py-2 font-extrabold">
                      {story.titleEs}
                      <span className="block text-xs font-semibold">/{story.slug}</span>
                    </td>
                    <td className="px-3 py-2">{maskName(story.maskId)}</td>
                    <td className="px-3 py-2">{story.publishedAt ? t("published") : t("draft")}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setEditing({ kind: "edit", story })} className={`${ADMIN_BUTTON} text-sm`}>
                          {tc("edit")}
                        </button>
                        <DeleteButton label={story.titleEs} onConfirm={() => remove(story)} />
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

interface FormProps {
  story: AdminStoryDto | null;
  masks: { id: string; label: string }[];
  onSaved: (story: AdminStoryDto, message: string) => void;
  onCancel: () => void;
}

function StoryForm({ story, masks, onSaved, onCancel }: FormProps) {
  const t = useTranslations("Admin.stories");
  const tc = useTranslations("Admin.costs");
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const [values, setValues] = useState({
    titleEs: story?.titleEs ?? "",
    titleEn: story?.titleEn ?? "",
    slug: story?.slug ?? "",
    bodyEs: story?.bodyEs ?? "",
    bodyEn: story?.bodyEn ?? "",
    maskId: story?.maskId ?? "",
    published: story ? story.publishedAt !== null : false,
  });
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof values>) => setValues((current) => ({ ...current, ...patch }));

  async function save(event: FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    const wasPublished = story?.publishedAt != null;
    const body = {
      titleEs: values.titleEs,
      titleEn: values.titleEn,
      ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
      bodyEs: values.bodyEs,
      bodyEn: values.bodyEn,
      maskId: values.maskId || null,
      ...(values.published === wasPublished ? {} : { publishedAt: values.published ? new Date().toISOString() : null }),
    };
    const result = await request<{ data: AdminStoryDto }>(story ? `/api/admin/stories/${story.id}` : "/api/admin/stories", {
      method: story ? "PUT" : "POST",
      body,
    });
    setIsBusy(false);
    if (result.kind !== "ok") return setNotice(toNotice(result));
    onSaved(result.data.data, t("saved"));
  }

  async function uploadCover() {
    const file = coverRef.current?.files?.[0];
    if (!story || !file) return;
    const form = new FormData();
    form.append("cover", file);
    setIsBusy(true);
    const result = await request<{ data: AdminStoryDto }>(`/api/admin/stories/${story.id}/cover`, { method: "POST", body: form });
    setIsBusy(false);
    if (result.kind === "failed" && result.status === 503) return setNotice({ kind: "error", message: t("coverUnavailable"), fields: [] });
    if (result.kind !== "ok") return setNotice(toNotice(result));
    onSaved(result.data.data, t("coverSaved"));
  }

  return (
    <form onSubmit={save} className={`${ADMIN_PANEL} flex flex-col gap-4`}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label={t("titleEs")} value={values.titleEs} onChange={(titleEs) => set({ titleEs })} />
        <TextField label={t("titleEn")} value={values.titleEn} onChange={(titleEn) => set({ titleEn })} />
      </div>
      <TextField label={t("slug")} value={values.slug} required={false} onChange={(slug) => set({ slug })} />
      <RichTextField label={t("bodyEs")} value={values.bodyEs} onChange={(bodyEs) => set({ bodyEs })} />
      <RichTextField label={t("bodyEn")} value={values.bodyEn} onChange={(bodyEn) => set({ bodyEn })} />
      <SelectField label={t("mask")} none={t("none")} value={values.maskId} options={masks} onChange={(maskId) => set({ maskId })} />
      <label className="flex items-center gap-2 font-extrabold">
        <input type="checkbox" checked={values.published} onChange={(event) => set({ published: event.target.checked })} />
        {t("published")}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-extrabold">{t("cover")}</legend>
        {story?.coverR2Key && <p className="text-sm font-semibold">{story.coverR2Key}</p>}
        {story ? (
          <div className="flex flex-wrap items-center gap-2">
            <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" />
            <button type="button" className={ADMIN_BUTTON} onClick={uploadCover} disabled={isBusy}>
              {t("uploadCover")}
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold">{t("coverAfterSave")}</p>
        )}
      </fieldset>

      <Notice notice={notice} id="historia-form-aviso" />
      <div className="flex gap-2">
        <button type="submit" className={ADMIN_PRIMARY_BUTTON} disabled={isBusy}>
          {t("save")}
        </button>
        <button type="button" className={ADMIN_BUTTON} onClick={onCancel}>
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}

function TextField({ label, value, onChange, required = true }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 font-extrabold">
      {label}
      <input className={ADMIN_INPUT} required={required} maxLength={200} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

const TOOLS = [
  { key: "bold", open: "<strong>", close: "</strong>" },
  { key: "italic", open: "<em>", close: "</em>" },
  { key: "h2", open: "<h2>", close: "</h2>" },
  { key: "list", open: "<ul>\n<li>", close: "</li>\n</ul>" },
  { key: "quote", open: "<blockquote>", close: "</blockquote>" },
] as const;

/** Editor mínimo: HTML con botones que envuelven la selección. La API decide qué sobrevive. */
function RichTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const t = useTranslations("Admin.stories");
  const ref = useRef<HTMLTextAreaElement>(null);

  function apply(open: string, close: string) {
    const area = ref.current;
    if (!area) return;
    onChange(wrapSelection(value, area.selectionStart, area.selectionEnd, open, close));
    area.focus();
  }

  function link() {
    const href = window.prompt(t("linkPrompt"));
    if (!href || !/^https?:\/\//i.test(href)) return;
    apply(`<a href="${href.replace(/"/g, "&quot;")}">`, "</a>");
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="font-extrabold" htmlFor={`rt-${label}`}>
        {label}
      </label>
      <div role="toolbar" aria-label={t("toolbar")} className="flex flex-wrap gap-1">
        {TOOLS.map((tool) => (
          <button key={tool.key} type="button" className={`${ADMIN_BUTTON} text-xs`} onClick={() => apply(tool.open, tool.close)}>
            {t(tool.key)}
          </button>
        ))}
        <button type="button" className={`${ADMIN_BUTTON} text-xs`} onClick={link}>
          {t("link")}
        </button>
      </div>
      <textarea
        id={`rt-${label}`}
        ref={ref}
        required
        rows={10}
        className={`${ADMIN_INPUT} font-mono text-sm`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
