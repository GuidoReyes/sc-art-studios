import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "./richText.js";
import { SLUG_PATTERN, slugify } from "./slug.js";
import { parseVideoUrl } from "./videoUrls.js";

describe("slugify", () => {
  it.each([
    ["Jaguar Dorado", "jaguar-dorado"],
    ["  Ñandú   rosa!! ", "nandu-rosa"],
    ["Lobo / Florido — 2", "lobo-florido-2"],
    ["¿?", ""],
  ])("%s → %s", (text, slug) => {
    expect(slugify(text)).toBe(slug);
  });

  it("recorta a 120 sin dejar un guion al final", () => {
    const slug = slugify(`${"a".repeat(119)} bcd`);

    expect(slug).toBe("a".repeat(119));
    expect(SLUG_PATTERN.test(slug)).toBe(true);
  });
});

describe("sanitizeRichText", () => {
  it("deja formato y enlaces seguros", () => {
    const html = '<h2>Título</h2><p>Hola <strong>mundo</strong> <a href="https://scartstudios.com">sitio</a></p>';

    expect(sanitizeRichText(html)).toBe(
      '<h2>Título</h2><p>Hola <strong>mundo</strong> <a href="https://scartstudios.com" rel="noopener noreferrer nofollow" target="_blank">sitio</a></p>',
    );
  });

  it.each([
    ['<p onclick="alert(1)">x</p>', "<p>x</p>"],
    ["<script>alert(1)</script><p>x</p>", "<p>x</p>"],
    ['<a href="javascript:alert(1)">x</a>', '<a rel="noopener noreferrer nofollow" target="_blank">x</a>'],
    ['<img src="https://x.test/a.png" onerror="alert(1)">', ""],
    ['<iframe src="https://evil.test"></iframe>', ""],
    ['<p style="color:red">x</p>', "<p>x</p>"],
  ])("limpia %s", (dirty, clean) => {
    expect(sanitizeRichText(dirty)).toBe(clean);
  });

  it("no deja que el autor cambie rel ni target", () => {
    expect(sanitizeRichText('<a href="https://a.test" rel="opener" target="_self">x</a>')).toBe(
      '<a href="https://a.test" rel="noopener noreferrer nofollow" target="_blank">x</a>',
    );
  });
});

describe("parseVideoUrl", () => {
  const ID = "dQw4w9WgXcQ";

  it.each([
    `https://www.youtube.com/watch?v=${ID}&si=rastreo`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=rastreo`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
  ])("YouTube: %s", (url) => {
    expect(parseVideoUrl(url)).toEqual({
      platform: "YOUTUBE",
      externalId: ID,
      url: `https://www.youtube.com/watch?v=${ID}`,
    });
  });

  it("TikTok con cuenta y sin parámetros de rastreo", () => {
    expect(parseVideoUrl("https://www.tiktok.com/@scartstudios/video/7312345678901234567?is_from_webapp=1")).toEqual({
      platform: "TIKTOK",
      externalId: "7312345678901234567",
      url: "https://www.tiktok.com/@scartstudios/video/7312345678901234567",
    });
  });

  it.each([
    ["https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=rastreo", "reel"],
    ["https://www.instagram.com/reels/C1a2B3c4D5e/", "reel"],
    ["https://www.instagram.com/scartstudios/reel/C1a2B3c4D5e/", "reel"],
    ["https://instagram.com/p/C1a2B3c4D5e", "p"],
  ])("Instagram: %s", (url, kind) => {
    expect(parseVideoUrl(url)).toEqual({
      platform: "INSTAGRAM",
      externalId: "C1a2B3c4D5e",
      url: `https://www.instagram.com/${kind}/C1a2B3c4D5e/`,
    });
  });

  it.each([
    "no es url",
    `http://www.youtube.com/watch?v=${ID}`,
    "https://www.youtube.com/watch?v=corto",
    "https://www.youtube.com/channel/UC123",
    "https://vm.tiktok.com/ZMabc123/",
    "https://www.tiktok.com/@cuenta",
    "https://www.instagram.com/scartstudios/",
    "https://www.instagram.com/a/b/reel/C1a2B3c4D5e/",
    `https://evil.test/watch?v=${ID}`,
    `https://youtube.com.evil.test/watch?v=${ID}`,
  ])("rechaza %s", (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});
