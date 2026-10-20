import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MaskCard } from "@/components/MaskCard";
import { PriceTag } from "@/components/PriceTag";
import { SectionBlock } from "@/components/SectionBlock";
import { SocialLinks } from "@/components/SocialLinks";
import { StatusPill } from "@/components/StatusPill";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { asLocale } from "@/i18n/routing";
import type { MaskSummary, PublicMaskStatus } from "@/lib/mask";
import { SURFACES, type SurfaceName } from "@/lib/palette";
import { WHATSAPP_NUMBER } from "@/lib/site";
import type { SocialLink } from "@/lib/social";

// Vitrina de componentes solo para desarrollo (tarea 26.6). En producción responde 404.

export const metadata: Metadata = { title: "Componentes", robots: { index: false, follow: false } };

// Datos de ejemplo. En el sitio real el precio viene de Shopify y el tipo de cambio de CostSettings.
const EXAMPLE_GTQ_PER_USD = 7.645;
const EXAMPLE_MASKS: readonly MaskSummary[] = [
  { slug: "jaguar-dorado", name: "Jaguar Dorado", animal: "Jaguar", status: "AVAILABLE", priceUsd: 95, image: null },
  { slug: "quetzal-de-fuego", name: "Quetzal de Fuego", animal: "Quetzal", status: "RESERVED", priceUsd: 120, image: null },
  { slug: "tucan-arcoiris", name: "Tucán Arcoíris", animal: "Tucán", status: "SOLD", priceUsd: 95, image: null },
  { slug: "perro-salchicha", name: "Perro Salchicha", animal: "Perro", status: "COMMISSION_EXAMPLE", priceUsd: 110, image: null },
];
const EXAMPLE_SOCIAL: readonly SocialLink[] = [
  { platform: "youtube", url: "https://www.youtube.com" },
  { platform: "tiktok", url: "https://www.tiktok.com" },
  { platform: "instagram", url: "https://www.instagram.com" },
  { platform: "facebook", url: "https://www.facebook.com" },
];
const STATUSES: readonly PublicMaskStatus[] = ["AVAILABLE", "RESERVED", "SOLD", "COMMISSION_EXAMPLE"];

function Specimen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl">{title}</h2>
      {children}
    </div>
  );
}

type Props = { params: Promise<{ locale: string }> };

export default async function TestComponentsPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <div className="flex flex-col gap-16 pb-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pt-12">
        <h1 className="font-display text-4xl sm:text-5xl">Componentes</h1>

        <Specimen title="MaskCard">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMPLE_MASKS.map((mask) => (
              <li key={mask.slug}>
                <MaskCard mask={mask} gtqPerUsd={mask.slug === "jaguar-dorado" ? EXAMPLE_GTQ_PER_USD : undefined} />
              </li>
            ))}
          </ul>
        </Specimen>

        <Specimen title="StatusPill">
          <div className="flex flex-wrap gap-3">
            {STATUSES.map((status) => (
              <StatusPill key={status} status={status} />
            ))}
          </div>
        </Specimen>

        <Specimen title="PriceTag">
          <div className="flex flex-wrap gap-10">
            <PriceTag usd={95} />
            <PriceTag usd={95} gtqPerUsd={EXAMPLE_GTQ_PER_USD} />
            <PriceTag usd={77.3} gtqPerUsd={EXAMPLE_GTQ_PER_USD} />
          </div>
        </Specimen>

        <Specimen title="WhatsAppButton">
          {WHATSAPP_NUMBER ? (
            <WhatsAppButton phone={WHATSAPP_NUMBER} message="Hola, me interesa la máscara Jaguar Dorado" />
          ) : (
            <p className="font-semibold">Define NEXT_PUBLIC_WHATSAPP_NUMBER en apps/web/.env.local para verlo.</p>
          )}
        </Specimen>

        <Specimen title="SocialLinks">
          <SocialLinks links={EXAMPLE_SOCIAL} />
          <div className="w-fit rounded-card bg-ink p-4">
            <SocialLinks links={EXAMPLE_SOCIAL} tone="dark" />
          </div>
        </Specimen>

        <Specimen title="SectionBlock (tarjeta)">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(SURFACES) as SurfaceName[]).map((color) => (
              <SectionBlock key={color} color={color} isCard>
                <p className="font-display text-2xl">{color}</p>
                <p>Texto normal sobre este fondo; pasa WCAG AA.</p>
              </SectionBlock>
            ))}
          </div>
        </Specimen>
      </div>

      <SectionBlock color="pink" aria-labelledby="franja-rosa">
        <h2 id="franja-rosa" className="font-display text-3xl">
          SectionBlock a todo lo ancho
        </h2>
        <p className="mt-2 max-w-xl text-lg">Franja rosa (pink-deep con texto crema) para separar secciones de una página.</p>
      </SectionBlock>
    </div>
  );
}
