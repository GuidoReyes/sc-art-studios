import type { Metadata } from "next";
import type { ReactNode } from "react";

// Capa 5: el admin no se indexa ni se enlaza desde el sitio público.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-ink p-4 text-cream sm:p-8">{children}</div>;
}
