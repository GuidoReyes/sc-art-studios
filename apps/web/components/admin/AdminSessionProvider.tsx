"use client";

import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { AdminSessionDto } from "@sc-art-studio/shared";
import {
  type AdminRequest,
  type AdminResult,
  adminRequest,
  logout as apiLogout,
  restoreSession,
} from "@/lib/adminApi";

// "unknown": todavía no se preguntó a la API (o se pidió reintentar).
export type SessionStatus = "unknown" | "ready" | "none" | "failed";

interface AdminSessionValue {
  status: SessionStatus;
  session: AdminSessionDto | null;
  /** Busca la sesión en la API (cookies). */
  restore: () => Promise<void>;
  /** Tras un fallo de red: vuelve a "unknown" para que el panel pregunte otra vez. */
  retry: () => void;
  /** Tras un login correcto. */
  start: (session: AdminSessionDto) => void;
  signOut: () => Promise<void>;
  /** Pedido a /api/admin; guarda el CSRF renovado y marca la sesión como terminada si venció. */
  request: <T>(path: string, init?: AdminRequest) => Promise<AdminResult<T>>;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

// El CSRF vive solo en memoria (estado de React): no va a localStorage ni a cookies legibles.
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("unknown");
  const [session, setSessionState] = useState<AdminSessionDto | null>(null);
  // `request` lee la sesión de aquí para no cambiar de identidad cada vez que se renueva el CSRF
  // (si cambiara, los efectos que dependen de él volverían a pedir los datos).
  const sessionRef = useRef<AdminSessionDto | null>(null);
  const setSession = useCallback((next: AdminSessionDto | null) => {
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  const restore = useCallback(async () => {
    const result = await restoreSession();
    setSession(result.kind === "ok" ? result.session : null);
    setStatus(result.kind === "ok" ? "ready" : result.kind);
  }, [setSession]);

  const retry = useCallback(() => setStatus("unknown"), []);

  const start = useCallback((next: AdminSessionDto) => {
    setSession(next);
    setStatus("ready");
  }, [setSession]);

  const signOut = useCallback(async () => {
    await apiLogout();
    setSession(null);
    setStatus("none");
  }, [setSession]);

  const request = useCallback(
    async <T,>(path: string, init?: AdminRequest): Promise<AdminResult<T>> => {
      const current = sessionRef.current;
      if (!current) return { kind: "unauthenticated" };
      const result = await adminRequest<T>(path, current, init);
      if (result.kind === "ok" && result.session !== current) setSession(result.session);
      if (result.kind === "unauthenticated") {
        setSession(null);
        setStatus("none");
      }
      return result;
    },
    [setSession],
  );

  const value = useMemo(
    () => ({ status, session, restore, retry, start, signOut, request }),
    [status, session, restore, retry, start, signOut, request],
  );
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession va dentro de <AdminSessionProvider>");
  return value;
}
