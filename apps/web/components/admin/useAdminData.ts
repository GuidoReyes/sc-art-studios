"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminSession } from "./AdminSessionProvider";

export type AdminDataState<T> = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; data: T };

/**
 * Lee `path` de /api/admin al montar y cada vez que se llama a `reload`. Sin sesión no cambia de
 * estado: AdminShell ya está mandando al login.
 */
export function useAdminData<T>(path: string): { state: AdminDataState<T>; reload: () => void } {
  const { request } = useAdminSession();
  const [state, setState] = useState<AdminDataState<T>>({ kind: "loading" });
  // Cada recarga sube `attempt` y vuelve a correr el efecto.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    void request<T>(path).then((result) => {
      if (!isCurrent) return;
      if (result.kind === "ok") setState({ kind: "ready", data: result.data });
      else if (result.kind === "failed") setState({ kind: "failed" });
    });
    return () => {
      isCurrent = false;
    };
  }, [request, path, attempt]);

  const reload = useCallback(() => {
    setState({ kind: "loading" });
    setAttempt((current) => current + 1);
  }, []);

  return { state, reload };
}
