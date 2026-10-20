import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import es from "../messages/es.json";
import en from "../messages/en.json";
import { CartIndicator } from "./CartIndicator";
import { PriceTag } from "./PriceTag";
import { SectionBlock } from "./SectionBlock";
import { SocialLinks } from "./SocialLinks";
import { StatusPill } from "./StatusPill";
import { WhatsAppButton } from "./WhatsAppButton";

function render(node: ReactNode, locale: "es" | "en" = "es"): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("StatusPill", () => {
  it("traduce cada estado y usa su color", () => {
    expect(render(<StatusPill status="AVAILABLE" />)).toMatch(/bg-turquoise text-ink[^>]*>Disponible</);
    expect(render(<StatusPill status="SOLD" />, "en")).toContain(">Sold<");
    expect(render(<StatusPill status="COMMISSION_EXAMPLE" />)).toContain("Ejemplo de encargo");
  });
});

describe("PriceTag", () => {
  it("muestra solo USD cuando no recibe tipo de cambio", () => {
    const html = render(<PriceTag usd={95} />);
    expect(html).toContain("US$95");
    expect(html).not.toContain("Q");
  });

  it("agrega los quetzales aproximados con el tipo de cambio recibido", () => {
    expect(render(<PriceTag usd={95} gtqPerUsd={7.645} />)).toContain("aprox. Q726");
  });
});

describe("WhatsAppButton", () => {
  it("no se muestra sin número configurado", () => {
    expect(render(<WhatsAppButton phone={undefined} message="Hola" />)).toBe("");
  });

  it("abre wa.me en otra pestaña con el mensaje prellenado", () => {
    const html = render(<WhatsAppButton phone="+502 5555 0000" message="Hola" />);
    expect(html).toContain('href="https://wa.me/50255550000?text=Hola"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Escríbenos por WhatsApp");
  });
});

describe("SocialLinks", () => {
  it("pinta solo enlaces https con nombre accesible", () => {
    const html = render(
      <SocialLinks
        links={[
          { platform: "youtube", url: "https://www.youtube.com/@x" },
          { platform: "tiktok", url: "javascript:alert(1)" },
        ]}
      />,
    );
    expect(html).toContain('aria-label="SC Art Studio en YouTube (se abre en una pestaña nueva)"');
    expect(html).not.toContain("javascript:");
  });

  it("no pinta nada cuando no hay enlaces válidos", () => {
    expect(render(<SocialLinks links={[]} />)).toBe("");
  });
});

describe("SectionBlock", () => {
  it("el bloque rosa usa pink-deep con texto crema", () => {
    expect(render(<SectionBlock color="pink">Hola</SectionBlock>)).toContain("bg-pink-deep text-cream");
  });
});

describe("CartIndicator", () => {
  it("anuncia el contenido del carrito con plural", () => {
    expect(render(<CartIndicator count={0} />)).toContain("Carrito vacío");
    expect(render(<CartIndicator count={2} />, "en")).toContain("Cart: 2 masks");
  });
});
