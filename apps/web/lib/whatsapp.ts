// Formato internacional E.164: entre 8 y 15 dígitos con el código de país.
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

/** Enlace wa.me con mensaje prellenado. El número es el del adulto responsable (variable de entorno). */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!PHONE_PATTERN.test(phone) || digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
    throw new Error("El número de WhatsApp no es válido");
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
