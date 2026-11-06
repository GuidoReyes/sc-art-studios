// oEmbed (tarea 41, PRD 5.6): el admin pega el enlace y de la red salen el título y la miniatura.
// Capa 6: timeout de 5 s por intento, hasta 3 intentos con espera creciente y solo en fallos pasajeros.
// La miniatura se baja, se re-codifica con sharp (sin EXIF) y se sube al bucket público de R2;
// sin R2 se guarda la URL remota de la red (puede caducar: TikTok e Instagram firman sus URLs).
import { createHash } from "node:crypto";
import { OEMBED_BACKOFF_MS, OEMBED_MAX_ATTEMPTS, OEMBED_TIMEOUT_MS, THUMBNAIL_MAX_BYTES } from "../config.js";
import type { VideoPlatform } from "../generated/prisma/client.js";
import { processThumbnail } from "../lib/images.js";
import type { ReferenceStorage } from "../lib/storage.js";
import { parseVideoUrl } from "../lib/videoUrls.js";

export interface ResolvedVideo {
  platform: VideoPlatform;
  externalId: string;
  url: string;
  title: string;
  thumbnailUrl: string | null;
  /** HTML del reproductor tal como lo da la red. Solo informativo: la web arma su propio iframe. */
  embedHtml: string | null;
  /** true si la red no respondió y se usan datos mínimos deducidos de la URL. */
  partial: boolean;
}

export class InvalidVideoUrlError extends Error {
  constructor() {
    super("Pega el enlace completo de un video de YouTube, TikTok o Instagram");
  }
}

export interface OEmbedOptions {
  fetch?: typeof fetch;
  /** Bucket público para las miniaturas y la URL desde la que se sirven. */
  media?: { storage: ReferenceStorage; publicUrl: string };
  instagramToken?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export type OEmbedResolver = (rawUrl: string) => Promise<ResolvedVideo>;

interface OEmbedResponse {
  title?: unknown;
  thumbnail_url?: unknown;
  html?: unknown;
}

const TITLE_MAX = 300;
const FALLBACK_TITLE: Record<VideoPlatform, string> = {
  YOUTUBE: "Video de YouTube",
  TIKTOK: "Video de TikTok",
  INSTAGRAM: "Video de Instagram",
};

function endpoint(platform: VideoPlatform, url: string, instagramToken?: string): string | null {
  const q = encodeURIComponent(url);
  if (platform === "YOUTUBE") return `https://www.youtube.com/oembed?format=json&url=${q}`;
  if (platform === "TIKTOK") return `https://www.tiktok.com/oembed?url=${q}`;
  if (!instagramToken) return null;
  return `https://graph.facebook.com/v21.0/instagram_oembed?url=${q}&access_token=${encodeURIComponent(instagramToken)}`;
}

class PermanentError extends Error {}

const isHttps = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export function createOEmbedResolver(options: OEmbedOptions = {}): OEmbedResolver {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? OEMBED_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? OEMBED_MAX_ATTEMPTS;
  const backoffMs = options.backoffMs ?? OEMBED_BACKOFF_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  /** Reintenta errores de red, timeouts, 429 y 5xx; un 4xx es definitivo (video privado o borrado). */
  async function withRetries(url: string): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await doFetch(url, {
          headers: { Accept: "application/json, image/*" },
          redirect: "follow",
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) return res;
        if (res.status !== 429 && res.status < 500) throw new PermanentError(`oEmbed respondió ${res.status}`);
        lastError = new Error(`oEmbed respondió ${res.status}`);
      } catch (error) {
        if (error instanceof PermanentError) throw error;
        lastError = error;
      }
      if (attempt < maxAttempts) await sleep(backoffMs * 2 ** (attempt - 1));
    }
    throw lastError instanceof Error ? lastError : new Error("oEmbed no respondió");
  }

  async function storeThumbnail(remote: string, platform: VideoPlatform, externalId: string): Promise<string> {
    if (!options.media) return remote;
    try {
      const res = await withRetries(remote);
      const length = Number(res.headers.get("content-length") ?? 0);
      if (length > THUMBNAIL_MAX_BYTES) return remote;
      const body = Buffer.from(await res.arrayBuffer());
      if (body.byteLength > THUMBNAIL_MAX_BYTES) return remote;
      const image = await processThumbnail(body);
      // Nombre estable por video: volver a resolver el mismo enlace reemplaza la misma miniatura.
      const hash = createHash("sha256").update(`${platform}:${externalId}`).digest("hex").slice(0, 16);
      const key = `videos/${platform.toLowerCase()}-${hash}.${image.extension}`;
      await options.media.storage.put(key, image.data, image.contentType);
      return `${options.media.publicUrl}/${key}`;
    } catch {
      // Sin miniatura propia no se bloquea el alta: queda la URL de la red.
      return remote;
    }
  }

  return async (rawUrl) => {
    const parsed = parseVideoUrl(rawUrl.trim());
    if (!parsed) throw new InvalidVideoUrlError();
    const fallback: ResolvedVideo = {
      ...parsed,
      title: FALLBACK_TITLE[parsed.platform],
      thumbnailUrl: parsed.platform === "YOUTUBE" ? `https://i.ytimg.com/vi/${parsed.externalId}/hqdefault.jpg` : null,
      embedHtml: null,
      partial: true,
    };
    const api = endpoint(parsed.platform, parsed.url, options.instagramToken);

    let data: OEmbedResponse | null = null;
    if (api) {
      try {
        data = (await (await withRetries(api)).json()) as OEmbedResponse;
      } catch {
        data = null;
      }
    }

    const title =
      typeof data?.title === "string" && data.title.trim() !== "" ? data.title.trim().slice(0, TITLE_MAX) : fallback.title;
    const remoteThumb = isHttps(data?.thumbnail_url) ? data.thumbnail_url : fallback.thumbnailUrl;
    const thumbnailUrl = remoteThumb ? await storeThumbnail(remoteThumb, parsed.platform, parsed.externalId) : null;
    return {
      ...parsed,
      title,
      thumbnailUrl,
      embedHtml: typeof data?.html === "string" ? data.html : null,
      partial: data === null,
    };
  };
}
