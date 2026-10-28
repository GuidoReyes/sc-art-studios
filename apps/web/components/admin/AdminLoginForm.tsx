"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { login } from "@/lib/adminApi";
import { useAdminSession } from "./AdminSessionProvider";
import { ADMIN_BUTTON } from "./AdminShell";

type Problem = "required" | "invalid" | "locked" | "failed";

const INPUT =
  "w-full rounded-xl border-2 border-ink bg-white px-3 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-purple";

export function AdminLoginForm() {
  const t = useTranslations("Admin.login");
  const { start } = useAdminSession();
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Se lee del formulario al enviar: la contraseña no queda guardada en el estado de React.
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) return setProblem("required");

    setIsSending(true);
    setProblem(null);
    const result = await login(email, password);
    if (result.kind === "ok") {
      start(result.session);
      router.replace("/admin/dashboard");
      return;
    }
    setIsSending(false);
    setProblem(result.kind);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-describedby={problem ? "login-problem" : undefined}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-2 border-ink bg-white p-6"
    >
      <div>
        <h1 className="font-display text-3xl">{t("title")}</h1>
        <p className="mt-1 font-semibold">{t("intro")}</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-email" className="font-extrabold">
          {t("email")}
        </label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} className={INPUT} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-password" className="font-extrabold">
          {t("password")}
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          className={INPUT}
        />
      </div>
      <div aria-live="polite">
        {problem && (
          <p id="login-problem" className="font-extrabold text-pink-deep">
            {t(`errors.${problem}`)}
          </p>
        )}
      </div>
      <button type="submit" disabled={isSending} className={`${ADMIN_BUTTON} self-start bg-purple text-cream`}>
        {isSending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
