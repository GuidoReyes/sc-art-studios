// Slugs de máscaras e historias: minúsculas, números y guiones; van en las URLs públicas.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG_LENGTH = 120; // igual que las columnas Mask.slug y Story.slug

/** "Jaguar Dorado ñ" → "jaguar-dorado-n". Puede quedar vacío si el texto no tiene letras ni números. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
}
