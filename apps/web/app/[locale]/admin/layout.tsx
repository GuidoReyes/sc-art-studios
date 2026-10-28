import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminSessionProvider } from "@/components/admin/AdminSessionProvider";

// Capa 5: el admin no se indexa ni se enlaza desde el sitio público. Las páginas son cascarones:
// los datos llegan del navegador a /api/admin con las cookies de sesión, y la API es la que protege.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <AdminSessionProvider>{children}</AdminSessionProvider>
    </div>
  );
}
