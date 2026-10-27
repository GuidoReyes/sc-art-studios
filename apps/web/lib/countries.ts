// Códigos de país ISO 3166-1 alfa-2: la misma regla que apps/api/src/lib/countries.ts, para que el
// selector del formulario de encargos no ofrezca códigos que la API rechace.
const countryNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
// Códigos que Intl reconoce pero no son países: uso privado (AA, QM–QZ, XA–XZ salvo XK = Kosovo,
// ZZ = "Unknown Region") y agrupaciones (EU, EZ, UN, QO).
const NOT_A_COUNTRY = /^(AA|Q[M-Z]|X[A-JL-Z]|ZZ|EU|EZ|UN|QO)$/;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Espera el código ya en mayúsculas. */
export function isCountryCode(code: string): boolean {
  if (!/^[A-Z]{2}$/.test(code) || NOT_A_COUNTRY.test(code)) return false;
  return countryNames.of(code) !== undefined;
}

export interface CountryOption {
  code: string;
  name: string;
}

/** Todos los países, con su nombre en el idioma de la página y en orden alfabético de ese idioma. */
export function countryOptions(locale: string): CountryOption[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const codes = [...LETTERS].flatMap((first) => [...LETTERS].map((second) => first + second)).filter(isCountryCode);
  return codes
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
