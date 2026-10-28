import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import es from "../messages/es.json";
import { routing } from "./routing";

type Messages = { [key: string]: string | Messages };

function flattenKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : flattenKeys(value, path);
  });
}

describe("mensajes de i18n", () => {
  it("en y es tienen exactamente las mismas claves", () => {
    expect(flattenKeys(es).sort()).toEqual(flattenKeys(en).sort());
  });

  it("ningún mensaje está vacío", () => {
    const values = [en, es].flatMap((m) => flattenKeys(m).map((k) => k.split(".").reduce<unknown>((o, p) => (o as Messages)[p], m)));
    expect(values.every((v) => typeof v === "string" && v.trim().length > 0)).toBe(true);
  });

  // Un "<" suelto en el texto se lee como etiqueta de ICU y el mensaje no se puede mostrar.
  it("todos los mensajes son ICU válidos", () => {
    const invalid = (["en", "es"] as const).flatMap((locale) => {
      const messages = locale === "en" ? en : es;
      const found: string[] = [];
      const t = createTranslator({
        locale,
        messages,
        onError: (error) => {
          if (error.code === "INVALID_MESSAGE") found.push(`${locale}: ${error.message}`);
        },
        getMessageFallback: ({ key }) => key,
      });
      // Sin valores para los {placeholders}: eso da FORMATTING_ERROR, que aquí no importa.
      for (const key of flattenKeys(messages)) t(key as never);
      return found;
    });
    expect(invalid).toEqual([]);
  });

  it("el idioma por defecto es inglés y existe un archivo por idioma", () => {
    expect(routing.defaultLocale).toBe("en");
    expect(routing.locales).toEqual(["en", "es"]);
  });
});
