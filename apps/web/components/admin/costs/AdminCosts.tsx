"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CostSettingsSection } from "./CostSettingsSection";
import { PackagingProfilesSection } from "./PackagingProfilesSection";
import { ShippingRatesSection } from "./ShippingRatesSection";

const SECTIONS = [
  { key: "settings", id: "parametros", Content: CostSettingsSection },
  { key: "rates", id: "tarifas", Content: ShippingRatesSection },
  { key: "boxes", id: "cajas", Content: PackagingProfilesSection },
] as const;

/** Costos y envíos (tarea 42): parámetros del motor de precios, tarifas por zona y cajas. */
export function AdminCosts() {
  const t = useTranslations("Admin.costs");
  return (
    <div className="flex max-w-6xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl">{t("title")}</h1>
        <p className="max-w-3xl font-semibold">{t("intro")}</p>
        <nav aria-label={t("sectionsLabel")}>
          <ul className="flex flex-wrap gap-2">
            {SECTIONS.map(({ key, id }) => (
              <li key={key}>
                <a
                  href={`#${id}`}
                  className="block rounded-full border-2 border-ink bg-white px-3 py-1 text-sm font-extrabold hover:bg-turquoise focus-visible:outline-4 focus-visible:outline-purple"
                >
                  {t(`sections.${key}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      {SECTIONS.map(({ key, id, Content }) => (
        <Section key={key} id={id} title={t(`sections.${key}`)}>
          <Content />
        </Section>
      ))}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="flex scroll-mt-6 flex-col gap-4">
      <h2 id={`${id}-titulo`} className="font-display text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}
