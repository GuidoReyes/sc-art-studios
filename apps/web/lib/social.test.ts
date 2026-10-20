import { describe, expect, it } from "vitest";
import { safeSocialLinks } from "./social";

describe("safeSocialLinks", () => {
  it("conserva los enlaces https", () => {
    const links = [{ platform: "youtube", url: "https://www.youtube.com/@scartstudio" }] as const;
    expect(safeSocialLinks(links)).toEqual(links);
  });

  it("descarta enlaces que no son https o no son URL", () => {
    expect(
      safeSocialLinks([
        { platform: "tiktok", url: "http://www.tiktok.com/@x" },
        { platform: "instagram", url: "javascript:alert(1)" },
        { platform: "facebook", url: "no es url" },
      ]),
    ).toEqual([]);
  });
});
