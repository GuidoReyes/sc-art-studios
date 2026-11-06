"use client";

import { type FormEvent, useState } from "react";
import type { AdminVideoDto, AdminVideoListResponse } from "@sc-art-studio/shared";
import { useTranslations } from "next-intl";
import { useAdminSession } from "../AdminSessionProvider";
import { DeleteButton, type FormNotice, LoadFailed, Notice, useProblemNotice } from "../costs/formParts";
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_PANEL, ADMIN_PRIMARY_BUTTON } from "../styles";
import { useAdminData } from "../useAdminData";
import { OPTIONS_PAGE_LIMIT, type Option, useMaskOptions, useStoryOptions } from "./options";

/** Respuesta de POST /api/admin/oembed/resolve. */
export interface ResolvedVideo {
  platform: AdminVideoDto["platform"];
  externalId: string;
  url: string;
  title: string;
  thumbnailUrl: string | null;
  partial: boolean;
}

type Draft = { id: string | null; url: string; title: string; thumbnailUrl: string | null; maskId: string; storyId: string; published: boolean; partial: boolean };

const fromVideo = (video: AdminVideoDto): Draft => ({
  id: video.id,
  url: video.url,
  title: video.title,
  thumbnailUrl: video.thumbnailUrl,
  maskId: video.maskId ?? "",
  storyId: video.storyId ?? "",
  published: video.publishedAt !== null,
  partial: false,
});

/** Videos (tarea 41): pegar enlace → oEmbed → vista previa → guardar, con vínculo a máscara o historia. */
export function AdminVideos() {
  const t = useTranslations("Admin.videos");
  const tc = useTranslations("Admin.costs");
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const masks = useMaskOptions();
  const stories = useStoryOptions();
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const videos = useAdminData<AdminVideoListResponse>(
    `/api/admin/videos?limit=${OPTIONS_PAGE_LIMIT}${filter ? `&maskId=${filter}` : ""}`,
  );
  const maskName = (id: string | null) => masks.find((mask) => mask.id === id)?.label ?? "—";

  async function remove(video: AdminVideoDto) {
    const result = await request(`/api/admin/videos/${video.id}`, { method: "DELETE" });
    if (result.kind !== "ok") return setNotice(toNotice(result));
    setNotice({ kind: "ok", message: t("deleted") });
    videos.reload();
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl">{t("title")}</h1>
        <p className="max-w-3xl font-semibold">{t("intro")}</p>
      </header>

      {draft ? (
        <VideoForm
          key={draft.id ?? "nuevo"}
          initial={draft}
          masks={masks}
          stories={stories}
          onCancel={() => setDraft(null)}
          onDone={() => {
            setDraft(null);
            setNotice({ kind: "ok", message: t("saved") });
            videos.reload();
          }}
        />
      ) : (
        <button
          type="button"
          className={`${ADMIN_BUTTON} self-start`}
          onClick={() => setDraft({ id: null, url: "", title: "", thumbnailUrl: null, maskId: "", storyId: "", published: true, partial: false })}
        >
          {t("add")}
        </button>
      )}
      <Notice notice={draft ? null : notice} id="videos-aviso" />

      <label className="flex max-w-xs flex-col gap-1 font-extrabold">
        {t("filter")}
        <select className={ADMIN_INPUT} value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">{t("all")}</option>
          {masks.map((mask) => (
            <option key={mask.id} value={mask.id}>
              {mask.label}
            </option>
          ))}
        </select>
      </label>

      {videos.state.kind === "loading" && <p role="status">{tc("loading")}</p>}
      {videos.state.kind === "failed" && <LoadFailed onRetry={videos.reload} />}
      {videos.state.kind === "ready" &&
        (videos.state.data.data.length === 0 ? (
          <p className="font-semibold">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-ink bg-white">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b-2 border-ink">
                <tr>
                  {(["thumb", "title", "platform", "mask", "status", "actions"] as const).map((column) => (
                    <th key={column} scope="col" className="px-3 py-2 font-extrabold">
                      {t(`columns.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {videos.state.data.data.map((video) => (
                  <tr key={video.id} className="border-t border-ink/20">
                    <td className="px-3 py-2">
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- miniaturas de dominios variables
                        <img src={video.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-extrabold">
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="underline">
                        {video.title}
                      </a>
                    </td>
                    <td className="px-3 py-2">{video.platform}</td>
                    <td className="px-3 py-2">{maskName(video.maskId)}</td>
                    <td className="px-3 py-2">{video.publishedAt ? t("published") : t("draft")}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setDraft(fromVideo(video))} className={`${ADMIN_BUTTON} text-sm`}>
                          {tc("edit")}
                        </button>
                        <DeleteButton label={video.title} onConfirm={() => remove(video)} />
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
  initial: Draft;
  masks: Option[];
  stories: Option[];
  onDone: () => void;
  onCancel: () => void;
}

function VideoForm({ initial, masks, stories, onDone, onCancel }: FormProps) {
  const t = useTranslations("Admin.videos");
  const tc = useTranslations("Admin.costs");
  const { request } = useAdminSession();
  const toNotice = useProblemNotice();
  const [draft, setDraft] = useState(initial);
  const [resolved, setResolved] = useState(initial.id !== null);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  async function resolve() {
    setIsBusy(true);
    setNotice(null);
    const result = await request<{ data: ResolvedVideo }>("/api/admin/oembed/resolve", { method: "POST", body: { url: draft.url } });
    setIsBusy(false);
    if (result.kind !== "ok") {
      return setNotice(result.kind === "failed" && result.status === 400 ? { kind: "error", message: t("badUrl"), fields: ["url"] } : toNotice(result));
    }
    const video = result.data.data;
    set({ url: video.url, title: video.title, thumbnailUrl: video.thumbnailUrl, partial: video.partial });
    setResolved(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!resolved) return resolve();
    setIsBusy(true);
    const body = {
      url: draft.url,
      title: draft.title,
      thumbnailUrl: draft.thumbnailUrl,
      maskId: draft.maskId || null,
      storyId: draft.storyId || null,
      publishedAt: draft.published ? (initial.published && initial.id ? undefined : new Date().toISOString()) : null,
    };
    const result = await request(draft.id ? `/api/admin/videos/${draft.id}` : "/api/admin/videos", {
      method: draft.id ? "PUT" : "POST",
      body,
    });
    setIsBusy(false);
    if (result.kind !== "ok") return setNotice(toNotice(result));
    onDone();
  }

  return (
    <form onSubmit={save} className={`${ADMIN_PANEL} flex flex-col gap-4`} aria-describedby="video-form-aviso">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-72 flex-1 flex-col gap-1 font-extrabold">
          {t("url")}
          <input
            className={ADMIN_INPUT}
            type="url"
            required
            value={draft.url}
            onChange={(event) => {
              set({ url: event.target.value });
              setResolved(false);
            }}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </label>
        <button type="button" className={ADMIN_BUTTON} onClick={resolve} disabled={isBusy || draft.url.trim() === ""}>
          {isBusy && !resolved ? t("resolving") : t("resolve")}
        </button>
      </div>

      {resolved && (
        <>
          <div className="flex flex-wrap gap-4">
            {draft.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa de la miniatura resuelta
              <img src={draft.thumbnailUrl} alt="" className="h-32 w-56 rounded-xl border-2 border-ink object-cover" />
            )}
            <div className="flex min-w-72 flex-1 flex-col gap-3">
              {draft.partial && <p className="font-semibold">{t("partial")}</p>}
              <label className="flex flex-col gap-1 font-extrabold">
                {t("videoTitle")}
                <input className={ADMIN_INPUT} required maxLength={300} value={draft.title} onChange={(event) => set({ title: event.target.value })} />
              </label>
              <SelectField label={t("mask")} none={t("none")} value={draft.maskId} options={masks} onChange={(maskId) => set({ maskId })} />
              <SelectField label={t("story")} none={t("none")} value={draft.storyId} options={stories} onChange={(storyId) => set({ storyId })} />
              <label className="flex items-center gap-2 font-extrabold">
                <input type="checkbox" checked={draft.published} onChange={(event) => set({ published: event.target.checked })} />
                {t("published")}
              </label>
            </div>
          </div>
        </>
      )}
      <Notice notice={notice} id="video-form-aviso" />
      <div className="flex gap-2">
        <button type="submit" className={ADMIN_PRIMARY_BUTTON} disabled={isBusy || !resolved}>
          {t("save")}
        </button>
        <button type="button" className={ADMIN_BUTTON} onClick={onCancel}>
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}

export function SelectField({
  label,
  none,
  value,
  options,
  onChange,
}: {
  label: string;
  none: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 font-extrabold">
      {label}
      <select className={ADMIN_INPUT} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{none}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
