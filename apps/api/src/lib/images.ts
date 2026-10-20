// Capa 3: solo jpeg/png/webp, re-codificadas con sharp y sin EXIF/GPS (la foto del cliente puede traer
// la ubicación de su casa). El formato se detecta por el contenido, nunca por el nombre ni el Content-Type.
import sharp from "sharp";
import { REFERENCE_MAX_DIMENSION, REFERENCE_MAX_INPUT_PIXELS, REFERENCE_WEBP_QUALITY } from "../config.js";

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class UnsupportedImageError extends Error {
  constructor() {
    super("La foto debe ser JPG, PNG o WebP");
  }
}

export interface ProcessedImage {
  data: Buffer;
  contentType: "image/webp";
  extension: "webp";
}

export async function processReferenceImage(input: Buffer): Promise<ProcessedImage> {
  try {
    // limitInputPixels frena "bombas" de descompresión; failOn: "error" rechaza archivos dañados.
    // Se crea dentro del try: con un buffer vacío sharp falla al construirse.
    const image = sharp(input, { limitInputPixels: REFERENCE_MAX_INPUT_PIXELS, failOn: "error" });
    const { format } = await image.metadata();
    if (!format || !ACCEPTED_FORMATS.has(format)) throw new UnsupportedImageError();

    // sharp no copia metadatos a la salida salvo que se le pida (withMetadata), así que el EXIF se pierde.
    const data = await image
      .rotate() // aplica la orientación del EXIF antes de que se borre
      .resize({ width: REFERENCE_MAX_DIMENSION, height: REFERENCE_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: REFERENCE_WEBP_QUALITY })
      .toBuffer();
    return { data, contentType: "image/webp", extension: "webp" };
  } catch (error) {
    if (error instanceof UnsupportedImageError) throw error;
    throw new UnsupportedImageError();
  }
}
