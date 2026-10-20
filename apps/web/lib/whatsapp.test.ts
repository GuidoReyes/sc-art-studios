import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "./whatsapp";

describe("buildWhatsAppUrl", () => {
  it("arma el enlace de wa.me con el mensaje codificado", () => {
    expect(buildWhatsAppUrl("+502 5555 0000", "Hola, me interesa la máscara Jaguar Dorado")).toBe(
      "https://wa.me/50255550000?text=Hola%2C%20me%20interesa%20la%20m%C3%A1scara%20Jaguar%20Dorado",
    );
  });

  it("acepta el número con guiones o paréntesis", () => {
    expect(buildWhatsAppUrl("(502) 5555-0000", "Hola")).toBe("https://wa.me/50255550000?text=Hola");
  });

  it("rechaza números demasiado cortos o largos", () => {
    expect(() => buildWhatsAppUrl("1234", "Hola")).toThrow(/WhatsApp/);
    expect(() => buildWhatsAppUrl("1234567890123456", "Hola")).toThrow(/WhatsApp/);
  });

  it("rechaza texto con letras en lugar de número", () => {
    expect(() => buildWhatsAppUrl("llamar-al-50255550000", "Hola")).toThrow(/WhatsApp/);
  });
});
