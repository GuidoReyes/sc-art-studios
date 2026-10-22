import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionBlock } from "@/components/SectionBlock";
import { asLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";

// Zonas de FedEx cargadas en la DB (seed de la tarea 8). Si se agrega una zona, actualizar esta tabla.
const ZONES = [
  { code: "C", countries: ["US", "MX", "CA"] },
  { code: "E", countries: ["ES", "DE"] },
  { code: "F", countries: ["AU"] },
] as const;

// Fecha de la última revisión de aranceles y tiempos (PRD §6.5: avisar si pasan más de 60 días).
const REVIEWED_AT = "2026-10-21";
const ZONOS_URL = "https://zonos.com/us-tariff-updates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Pages" });
  const tPage = await getTranslations({ locale, namespace: "ShippingPage" });
  return { title: t("shipping"), description: tPage("intro"), alternates: buildAlternates("/shipping", locale) };
}

export default async function ShippingPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, tPages] = await Promise.all([getTranslations("ShippingPage"), getTranslations("Pages")]);
  const countryName = new Intl.DisplayNames([locale], { type: "region" });
  const reviewed = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(REVIEWED_AT));

  return (
    <>
      <header className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <h1 className="font-display text-5xl sm:text-6xl">{tPages("shipping")}</h1>
        <p className="mt-4 max-w-2xl text-lg font-semibold">{t("intro")}</p>
      </header>

      <SectionBlock color="turquoise" aria-labelledby="zonas">
        <h2 id="zonas" className="font-display text-4xl">
          {t("zonesTitle")}
        </h2>
        <table className="mt-6 w-full max-w-2xl overflow-hidden rounded-card border-4 border-ink bg-cream text-left">
          <thead className="bg-ink text-cream">
            <tr>
              <th scope="col" className="px-4 py-2">
                {t("zone")}
              </th>
              <th scope="col" className="px-4 py-2">
                {t("countries")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ZONES.map(({ code, countries }) => (
              <tr key={code} className="border-t-[3px] border-ink">
                <th scope="row" className="px-4 py-3 font-display text-xl">
                  {code}
                </th>
                <td className="px-4 py-3 font-extrabold">{countries.map((c) => countryName.of(c) ?? c).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 font-extrabold">{t("otherCountries")}</p>
        <p className="mt-4 max-w-2xl font-semibold">{t("timesBody")}</p>
      </SectionBlock>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-2">
        <section aria-labelledby="costo" className="rounded-card border-4 border-ink bg-orange p-6 shadow-sticker">
          <h2 id="costo" className="font-display text-3xl">
            {t("costTitle")}
          </h2>
          <p className="mt-3 text-lg font-semibold">{t("costBody")}</p>
        </section>
        <section aria-labelledby="aranceles" className="rounded-card border-4 border-ink bg-purple p-6 text-cream shadow-sticker">
          <h2 id="aranceles" className="font-display text-3xl">
            {t("dutiesTitle")}
          </h2>
          <p className="mt-3 text-lg font-semibold">{t("dutiesBody")}</p>
          <a href={ZONOS_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-extrabold underline underline-offset-4">
            {t("dutiesLink")}
          </a>
        </section>
        <section aria-labelledby="empaque" className="rounded-card border-4 border-ink bg-cream p-6 shadow-sticker">
          <h2 id="empaque" className="font-display text-3xl">
            {t("packagingTitle")}
          </h2>
          <p className="mt-3 text-lg font-semibold">{t("packagingBody")}</p>
        </section>
        <section aria-labelledby="danos" className="rounded-card border-4 border-ink bg-pink-deep p-6 text-cream shadow-sticker">
          <h2 id="danos" className="font-display text-3xl">
            {t("damageTitle")}
          </h2>
          <p className="mt-3 text-lg font-semibold">{t("damageBody")}</p>
        </section>
      </div>

      <p className="mx-auto max-w-5xl px-4 pb-14 text-sm font-extrabold">{t("reviewed", { date: reviewed })}</p>
    </>
  );
}
