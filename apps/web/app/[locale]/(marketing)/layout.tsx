import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;
  // Cada layout se renderiza por separado: sin esto, next-intl lee cabeceras y la página deja de ser estática.
  setRequestLocale(locale);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
