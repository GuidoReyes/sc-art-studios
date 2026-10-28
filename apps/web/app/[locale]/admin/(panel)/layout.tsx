import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

// Todo lo que está dentro de (panel) exige sesión; el login queda fuera.
export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
