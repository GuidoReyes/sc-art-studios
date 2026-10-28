"use client";

import { type ReactNode, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAdminSession } from "./AdminSessionProvider";

// Las secciones sin `href` todavía no existen (tareas 34, 40, 41 y 42): se ven, pero no enlazan.
const SECTIONS = [
  { key: "dashboard", href: "/admin/dashboard" },
  { key: "masks" },
  { key: "stories" },
  { key: "videos" },
  { key: "customRequests" },
  { key: "costs" },
  { key: "audit" },
] as const satisfies readonly { key: string; href?: "/admin/dashboard" }[];

export const ADMIN_BUTTON =
  "rounded-full border-2 border-ink bg-cream px-4 py-1.5 font-extrabold hover:bg-ink hover:text-cream focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:opacity-60";

/** Exige sesión: sin ella manda al login. Con ella pinta la barra lateral y el contenido. */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Admin");
  const { status, session, restore, retry, signOut } = useAdminSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unknown") void restore();
  }, [status, restore]);

  useEffect(() => {
    if (status === "none") router.replace("/admin/login");
  }, [status, router]);

  if (status === "failed") {
    return (
      <div role="alert" className="mx-auto mt-16 flex max-w-md flex-col items-start gap-4 px-4">
        <p className="font-extrabold">{t("session.failed")}</p>
        <button type="button" onClick={retry} className={ADMIN_BUTTON}>
          {t("session.retry")}
        </button>
      </div>
    );
  }

  if (status !== "ready" || !session) {
    return (
      <p role="status" className="mt-16 text-center font-semibold">
        {t("session.checking")}
      </p>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col gap-4 border-b-2 border-ink bg-white p-4 lg:sticky lg:top-0 lg:h-dvh lg:border-r-2 lg:border-b-0">
        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-start">
          <div>
            <p className="font-display text-xl">{t("brand")}</p>
            <p className="text-sm font-semibold">{t(`roles.${session.user.role}`)}</p>
          </div>
          <button type="button" onClick={() => void signOut()} className={`${ADMIN_BUTTON} text-sm lg:hidden`}>
            {t("nav.logout")}
          </button>
        </div>
        <nav aria-label={t("nav.label")} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-2 lg:flex-col lg:gap-1">
            {SECTIONS.map((section) => (
              <li key={section.key} className="shrink-0">
                {"href" in section ? (
                  <Link
                    href={section.href}
                    aria-current={pathname === section.href ? "page" : undefined}
                    className="block rounded-xl border-2 border-transparent px-3 py-2 font-extrabold hover:border-ink focus-visible:outline-4 focus-visible:outline-purple aria-[current=page]:border-ink aria-[current=page]:bg-turquoise"
                  >
                    {t(`nav.${section.key}`)}
                  </Link>
                ) : (
                  <span aria-disabled="true" className="flex items-center gap-2 px-3 py-2 font-semibold text-ink/70">
                    {t(`nav.${section.key}`)}
                    <span className="rounded-full bg-ink/10 px-2 text-xs font-extrabold">{t("nav.soon")}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto hidden flex-col items-start gap-3 lg:flex">
          <Link href="/" className="font-extrabold underline decoration-2 underline-offset-4">
            {t("nav.site")}
          </Link>
          <button type="button" onClick={() => void signOut()} className={ADMIN_BUTTON}>
            {t("nav.logout")}
          </button>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
