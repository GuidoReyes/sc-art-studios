import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { InvalidVideoUrlError, createOEmbedResolver } from "./oembed.service.js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const firstUrl = (fn: { mock: { calls: unknown[][] } }) => String(fn.mock.calls[0]?.[0]);
const noSleep = vi.fn(async () => undefined);

async function jpegWithExif(): Promise<Buffer> {
  return sharp({ create: { width: 800, height: 450, channels: 3, background: "#e33" } })
    .jpeg()
    .withExif({ IFD0: { Copyright: "secreto", Artist: "gps" } })
    .toBuffer();
}

describe("createOEmbedResolver", () => {
  it("YouTube: título y miniatura del oEmbed, URL canónica", async () => {
    const fetch = vi.fn(async () => json({ title: " Jaguar ", thumbnail_url: "https://i.ytimg.com/x.jpg", html: "<iframe>" }));
    const resolve = createOEmbedResolver({ fetch, sleep: noSleep });

    const video = await resolve("https://youtu.be/dQw4w9WgXcQ?si=rastreo");

    expect(video).toEqual({
      platform: "YOUTUBE",
      externalId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Jaguar",
      thumbnailUrl: "https://i.ytimg.com/x.jpg",
      embedHtml: "<iframe>",
      partial: false,
    });
    expect(firstUrl(fetch)).toMatch(/^https:\/\/www\.youtube\.com\/oembed\?format=json&url=/);
  });

  it("TikTok usa su endpoint", async () => {
    const fetch = vi.fn(async () => json({ title: "Máscara", thumbnail_url: "https://p16.tiktokcdn.com/t.jpg" }));
    const video = await createOEmbedResolver({ fetch, sleep: noSleep })("https://www.tiktok.com/@scarlett/video/7234567890123");

    expect(video.platform).toBe("TIKTOK");
    expect(video.title).toBe("Máscara");
    expect(firstUrl(fetch)).toMatch(/^https:\/\/www\.tiktok\.com\/oembed\?url=/);
  });

  it("Instagram sin token: no llama a la red y guarda datos mínimos", async () => {
    const fetch = vi.fn();
    const video = await createOEmbedResolver({ fetch, sleep: noSleep })("https://www.instagram.com/reel/Cabc123/");

    expect(fetch).not.toHaveBeenCalled();
    expect(video).toMatchObject({ platform: "INSTAGRAM", externalId: "Cabc123", title: "Video de Instagram", partial: true });
  });

  it("Instagram con token usa la Graph API", async () => {
    const fetch = vi.fn(async () => json({ title: "Reel", thumbnail_url: "https://scontent.cdninstagram.com/r.jpg" }));
    const video = await createOEmbedResolver({ fetch, sleep: noSleep, instagramToken: "tok" })(
      "https://www.instagram.com/reel/Cabc123/",
    );

    expect(firstUrl(fetch)).toContain("graph.facebook.com");
    expect(video.title).toBe("Reel");
  });

  it("reintenta 5xx y errores de red hasta 3 veces con espera creciente", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ title: "Al tercer intento" }));
    const sleep = vi.fn(async () => undefined);

    const video = await createOEmbedResolver({ fetch, sleep, backoffMs: 100 })("https://youtu.be/dQw4w9WgXcQ");

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[100], [200]]);
    expect(video.title).toBe("Al tercer intento");
  });

  it("un 404 no se reintenta y cae a datos mínimos (miniatura de YouTube deducida)", async () => {
    const fetch = vi.fn(async () => json({}, 404));
    const video = await createOEmbedResolver({ fetch, sleep: noSleep })("https://youtu.be/dQw4w9WgXcQ");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(video).toMatchObject({
      title: "Video de YouTube",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      partial: true,
    });
  });

  it("tras 3 fallos pasajeros no lanza: datos mínimos", async () => {
    const fetch = vi.fn(async () => {
      throw new DOMException("timeout", "TimeoutError");
    });
    const video = await createOEmbedResolver({ fetch, sleep: noSleep })("https://www.tiktok.com/@a/video/123");

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(video).toMatchObject({ title: "Video de TikTok", thumbnailUrl: null, partial: true });
  });

  it("ignora miniaturas que no son https", async () => {
    const fetch = vi.fn(async () => json({ title: "x", thumbnail_url: "javascript:alert(1)" }));
    const video = await createOEmbedResolver({ fetch, sleep: noSleep })("https://www.tiktok.com/@a/video/123");
    expect(video.thumbnailUrl).toBeNull();
  });

  it("con R2: sube la miniatura como WebP sin EXIF y devuelve la URL pública", async () => {
    const jpeg = await jpegWithExif();
    const fetch = vi.fn(async (url: string | URL | Request) =>
      String(url).includes("oembed") ? json({ title: "t", thumbnail_url: "https://i.ytimg.com/x.jpg" }) : new Response(new Uint8Array(jpeg)),
    );
    const storage = { put: vi.fn(async () => undefined), remove: vi.fn() };

    const video = await createOEmbedResolver({
      fetch,
      sleep: noSleep,
      media: { storage, publicUrl: "https://media.scartstudios.com" },
    })("https://youtu.be/dQw4w9WgXcQ");

    expect(video.thumbnailUrl).toMatch(/^https:\/\/media\.scartstudios\.com\/videos\/youtube-[0-9a-f]{16}\.webp$/);
    const [, data, type] = storage.put.mock.calls[0] as unknown as [string, Buffer, string];
    expect(type).toBe("image/webp");
    const meta = await sharp(data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.width).toBe(640);
  });

  it("si R2 falla, se queda con la URL remota", async () => {
    const fetch = vi.fn(async (url: string | URL | Request) =>
      String(url).includes("oembed") ? json({ title: "t", thumbnail_url: "https://i.ytimg.com/x.jpg" }) : new Response("no es imagen"),
    );
    const storage = { put: vi.fn(), remove: vi.fn() };
    const video = await createOEmbedResolver({ fetch, sleep: noSleep, media: { storage, publicUrl: "https://m.x" } })(
      "https://youtu.be/dQw4w9WgXcQ",
    );
    expect(video.thumbnailUrl).toBe("https://i.ytimg.com/x.jpg");
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("rechaza enlaces que no son de las tres redes", async () => {
    await expect(createOEmbedResolver({ fetch: vi.fn() })("https://vimeo.com/1")).rejects.toBeInstanceOf(InvalidVideoUrlError);
  });
});
