---
type: session
area: frontend
date: 2026-10-27
slug: panel-admin-login-y-resumen
title: "Panel de admin: login, sesión en el navegador y resumen con conteos"
tags: [frontend, admin, auth, csrf, refresh, dashboard, seguridad]
status: active
related:
  - 2026-10-20-login-admin-refresh-rotativo-csrf
  - 2026-10-20-crud-admin-auditado
  - 2026-10-26-sitio-publico-catalogo-envios-y-libro
superseded_by: null
sources:
  - repo:apps/web/lib/adminApi.ts
  - repo:apps/web/components/admin
  - repo:apps/web/app/[locale]/admin
  - repo:apps/api/src/routes/admin/dashboard.ts
  - repo:apps/api/src/repositories/admin/dashboard.ts
---

# Panel de admin: login, sesión en el navegador y resumen con conteos

## Contexto
Tarea 33 (fase 5). El usuario pidió seguir con el panel de admin **en local** mientras Shopify y el despliegue esperan. Usa el login de [[2026-10-20-login-admin-refresh-rotativo-csrf]] y vive junto al `/api/admin` de [[2026-10-20-crud-admin-auditado]].

## Decisiones
- **Sin middleware de JWT en Next** (lo que pedía 33.1): las cookies son `__Host-sc_access` y `__Secure-sc_refresh` del host de la API, así que Next (otro host) no puede leerlas. Las páginas del admin son cascarones; el navegador llama a la API con `credentials: "include"` y **la API es la que protege**. `AdminShell` solo redirige al login si `/api/auth/session` y el refresh responden 401.
- **CSRF solo en memoria** (estado de React con un `ref` para que `request` no cambie de identidad). Las lecturas GET no lo mandan: así no hay preflight de CORS.
- **Refresh compartido**: el refresh es de un solo uso y un segundo envío revoca la familia (`auth.refresh_reuse`). `lib/adminApi.ts` comparte un único refresh en vuelo entre pedidos simultáneos y el doble efecto de React en desarrollo. Entre pestañas distintas todavía podría chocar (raro; queda anotado).
- **`GET /api/admin/dashboard`**: máscaras y encargos por estado (los estados sin filas salen en 0), ventas (conteo, total y últimas 5). Sin datos personales: de las ventas solo país, total y nombre de la máscara.
- Barra lateral con todas las secciones; las que no existen aún (34, 40, 41, 42 y registro de cambios) se ven con "Pronto" y no enlazan. Fondo claro y componentes simples: es una herramienta, no marketing.
- `BROWSER_API_URL` en `lib/site.ts` reemplaza las copias de `NEXT_PUBLIC_API_URL` en el cotizador y el formulario de encargos.

## Output
- Commit `2151717`.
- Verificado: 392 pruebas de la API y 106 de la web, typecheck y lint; E2E en Chromium (escritorio y móvil): `/admin` → login, contraseña errónea con mensaje, login → resumen, recarga sin perder la sesión, JWT borrado → un solo refresh y sigue dentro (dos rondas), logout → login; axe sin violaciones, sin desborde, `noindex` presente.
- Admin de prueba solo en la DB local (`e2e-admin@example.com`, contraseña en el scratchpad de la sesión, nunca en el repo).

## Pendiente
- Tareas 34 (máscaras), 40 (encargos), 41 (historias y videos) y 42 (costos y envíos) sobre este panel; la 34 y la 40 tocan Shopify en su último paso.
- Pantalla de registro de cambios (AuditLog): no tiene tarea propia todavía.

## Cross-refs
- [[2026-10-20-login-admin-refresh-rotativo-csrf]] — el panel consume su login, `/session`, refresh rotativo y CSRF por sesión.
- [[2026-10-20-crud-admin-auditado]] — el resumen se monta bajo el mismo `/api/admin` (requireAdmin, límite por usuario, sin caché).
- [[2026-10-26-sitio-publico-catalogo-envios-y-libro]] — sitio público de la sesión anterior; comparte `BROWSER_API_URL` con su cotizador y formulario.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
