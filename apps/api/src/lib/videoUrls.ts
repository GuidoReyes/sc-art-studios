// El admin pega el enlace del video; de ahí salen la plataforma, el id y una URL canónica
// (sin parámetros de rastreo). Solo se aceptan las tres redes que permite la CSP de la web.
import type { VideoPlatform } from "../generated/prisma/client.js";

export interface ParsedVideoUrl {
  platform: VideoPlatform;
  externalId: string;
  url: string;
}

const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_PATH_KINDS = new Set(["shorts", "embed", "live"]);
const TIKTOK_HANDLE = /^@[\w.]{1,64}$/;
const TIKTOK_ID = /^\d{1,32}$/;
const INSTAGRAM_CODE = /^[\w-]{5,64}$/;
const INSTAGRAM_KINDS = new Set(["p", "reel", "reels", "tv"]);

function youtube(host: string, url: URL, parts: string[]): ParsedVideoUrl | null {
  const [first, second] = parts;
  let id: string | null | undefined;
  if (host === "youtu.be") id = first;
  else if (first === "watch") id = url.searchParams.get("v");
  else if (first && YOUTUBE_PATH_KINDS.has(first)) id = second;
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { platform: "YOUTUBE", externalId: id, url: `https://www.youtube.com/watch?v=${id}` };
}

function tiktok(parts: string[]): ParsedVideoUrl | null {
  const [handle, kind, id] = parts;
  if (!handle || !id || kind !== "video" || !TIKTOK_HANDLE.test(handle) || !TIKTOK_ID.test(id)) return null;
  return { platform: "TIKTOK", externalId: id, url: `https://www.tiktok.com/${handle}/video/${id}` };
}

function instagram(parts: string[]): ParsedVideoUrl | null {
  // instagram.com/reel/CODE o instagram.com/<cuenta>/reel/CODE
  const start = parts.findIndex((part) => INSTAGRAM_KINDS.has(part));
  const kind = parts[start];
  const code = parts[start + 1];
  if (start < 0 || start > 1 || !kind || !code || !INSTAGRAM_CODE.test(code)) return null;
  const path = kind === "reels" ? "reel" : kind;
  return { platform: "INSTAGRAM", externalId: code, url: `https://www.instagram.com/${path}/${code}/` };
}

/** null si no es un enlace https a un video de YouTube, TikTok o Instagram. */
export function parseVideoUrl(raw: string): ParsedVideoUrl | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "youtube.com" || host === "youtu.be") return youtube(host, url, parts);
  if (host === "tiktok.com") return tiktok(parts);
  if (host === "instagram.com") return instagram(parts);
  return null;
}
