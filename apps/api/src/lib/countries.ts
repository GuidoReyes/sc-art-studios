// Códigos de país ISO 3166-1 alfa-2 (formulario de encargos y cotizador de envío).
const countryNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
// Códigos que Intl reconoce pero no son países: uso privado (AA, QM–QZ, XA–XZ salvo XK = Kosovo,
// ZZ = "Unknown Region") y agrupaciones (EU, EZ, UN, QO).
const NOT_A_COUNTRY = /^(AA|Q[M-Z]|X[A-JL-Z]|ZZ|EU|EZ|UN|QO)$/;

/** Espera el código ya en mayúsculas. */
export function isCountryCode(code: string): boolean {
  if (!/^[A-Z]{2}$/.test(code) || NOT_A_COUNTRY.test(code)) return false;
  return countryNames.of(code) !== undefined;
}
