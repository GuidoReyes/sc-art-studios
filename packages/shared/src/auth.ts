// Contrato de /api/auth (login, refresh y session). Solo tipos.

export type AdminRole = "OWNER" | "EDITOR";

export interface AdminSessionDto {
  user: { id: string; role: AdminRole };
  /** Va en la cabecera X-CSRF-Token de todo POST/PUT/PATCH/DELETE del admin. Guardarlo en memoria. */
  csrfToken: string;
}

export interface AdminSessionResponse {
  data: AdminSessionDto;
}
