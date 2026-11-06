// Capa 3: solo jpeg/png/webp, re-codificadas con sharp y sin EXIF/GPS (la foto del cliente puede traer
// la ubicación de su casa). El formato se detecta por el contenido, nunca por el nombre ni el Content-Type.
import sharp, { type ResizeOptions } from "sharp";
import {
  COVER_HEIGHT,
  COVER_WIDTH,
  THUMBNAIL_WIDTH,
  REFERENCE_MAX_DIMENSION, REFERENCE_MAX_INPUT_PIXELS, REFERENCE_WEBP_QUALITY,
} from "../config.js";

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

type Resize = ResizeOptions;

/** Misma limpieza que las fotos de referencia, con otro recorte. */
async function toWebp(input: Buffer, resize: Resize): Promise<ProcessedImage> {
  try {
    const image = sharp(input, { limitInputPixels: REFERENCE_MAX_INPUT_PIXELS, failOn: "error" });
    const { format } = await image.metadata();
    if (!format || !ACCEPTED_FORMATS.has(format)) throw new UnsupportedImageError();
    const data = await image.rotate().resize(resize).webp({ quality: REFERENCE_WEBP_QUALITY }).toBuffer();
    return { data, contentType: "image/webp", extension: "webp" };
  } catch (error) {
    if (error instanceof UnsupportedImageError) throw error;
    throw new UnsupportedImageError();
  }
}

/** Portada de historia (tarea 41): 1200x630 recortada al centro, como la tarjeta Open Graph. */
export const processCoverImage = (input: Buffer) =>
  toWebp(input, { width: COVER_WIDTH, height: COVER_HEIGHT, fit: "cover", position: "centre" });

/** Miniatura de video traída por oEmbed: 640 px de ancho como máximo. */
export const processThumbnail = (input: Buffer) =>
  toWebp(input, { width: THUMBNAIL_WIDTH, fit: "inside", withoutEnlargement: true });
