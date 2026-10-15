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

  it("el idioma por defecto es inglés y existe un archivo por idioma", () => {
    expect(routing.defaultLocale).toBe("en");
    expect(routing.locales).toEqual(["en", "es"]);
  });
});
