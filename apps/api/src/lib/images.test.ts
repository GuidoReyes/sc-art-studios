import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { REFERENCE_MAX_DIMENSION } from "../config.js";
import { UnsupportedImageError, processReferenceImage } from "./images.js";

const square = (size: number) =>
  sharp({ create: { width: size, height: size, channels: 3, background: { r: 200, g: 60, b: 120 } } });

describe("processReferenceImage", () => {
  it.each(["jpeg", "png", "webp"] as const)("convierte %s a webp", async (format) => {
    const input = await square(64).toFormat(format).toBuffer();

    const result = await processReferenceImage(input);

    expect(result.contentType).toBe("image/webp");
    expect(result.extension).toBe("webp");
    expect((await sharp(result.data).metadata()).format).toBe("webp");
  });

  it("borra el EXIF (autor, GPS, cámara) de la foto", async () => {
    const input = await square(64)
      .jpeg()
      .withExif({ IFD0: { Artist: "Nombre del cliente", Copyright: "privado" } })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const { data } = await processReferenceImage(input);

    const metadata = await sharp(data).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(data.includes(Buffer.from("Nombre del cliente"))).toBe(false);
  });

  it("aplica la orientación del EXIF antes de borrarlo", async () => {
    const tall = await sharp({ create: { width: 40, height: 80, channels: 3, background: "#fff" } })
      .jpeg()
      .withMetadata({ orientation: 6 }) // girada 90°: se ve horizontal
      .toBuffer();

    const { data } = await processReferenceImage(tall);

    const { width, height } = await sharp(data).metadata();
    expect([width, height]).toEqual([80, 40]);
  });

  it("reduce las fotos grandes sin deformarlas ni agrandar las chicas", async () => {
    const big = await sharp({ create: { width: 4000, height: 2000, channels: 3, background: "#000" } })
      .png()
      .toBuffer();

    const reduced = await sharp((await processReferenceImage(big)).data).metadata();
    const small = await sharp((await processReferenceImage(await square(100).png().toBuffer())).data).metadata();

    expect([reduced.width, reduced.height]).toEqual([REFERENCE_MAX_DIMENSION, REFERENCE_MAX_DIMENSION / 2]);
    expect(small.width).toBe(100);
  });

  it.each([
    ["texto con extensión de imagen", Buffer.from("no soy una foto, soy un script <?php ?>")],
    ["SVG (puede llevar scripts)", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')],
    ["vacío", Buffer.alloc(0)],
  ])("rechaza %s", async (_name, input) => {
    await expect(processReferenceImage(input)).rejects.toBeInstanceOf(UnsupportedImageError);
  });

  it("rechaza formatos de imagen que no son jpeg, png ni webp", async () => {
    const gif = await square(16).gif().toBuffer();

    await expect(processReferenceImage(gif)).rejects.toBeInstanceOf(UnsupportedImageError);
  });

  it("rechaza una imagen truncada", async () => {
    const jpeg = await square(256).jpeg().toBuffer();

    await expect(processReferenceImage(jpeg.subarray(0, jpeg.length / 2))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
  });
});
