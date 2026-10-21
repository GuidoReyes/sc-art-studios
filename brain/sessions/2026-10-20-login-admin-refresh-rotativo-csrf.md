---
type: session
area: seguridad
date: 2026-10-20
slug: login-admin-refresh-rotativo-csrf
title: "Login del admin con argon2id, refresh rotativo, CSRF y bloqueo"
tags: [api, auth, jwt, csrf, argon2, auditoria, seguridad]
status: active
related:
  - 2026-10-20-cotizador-de-envio-sin-perdida
  - 2026-10-17-scaffold-backend-express
  - 2026-10-18-prisma-7-schema-y-migracion-inicial
sources:
  - repo:apps/api/src/routes/auth.ts
  - repo:apps/api/src/services/auth.ts
  - repo:apps/api/src/lib/tokens.ts
  - repo:apps/api/src/middleware/auth.ts
  - repo:apps/api/src/scripts/create-admin.ts
  - repo:apps/api/prisma/migrations/20261020153758_admin_sessions/
superseded_by: null
---

# Login del admin con argon2id, refresh rotativo, CSRF y bloqueo

## Contexto
Tarea 13 de Task Master (capa 1 de seguridad de `CLAUDE.md`): login del panel de administración. Se hizo en la misma sesión que el cotizador de envío, después de hacer push.

## Decisiones
- **Rutas:** `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` y `GET /api/auth/session` (devuelve el rol y el token CSRF para recuperarlo al recargar la página).
- **Acceso:** JWT HS256 de 15 min con `{sub, role, sid}` en la cookie `__Host-sc_access` (httpOnly, Secure, SameSite=Lax, Path=/). La tarea pedía `path=/admin`, pero la cookie la lee la API (`api.scartstudios.com`), no la web; el prefijo `__Host-` impide que un subdominio la plante.
- **Refresh rotativo** (CLAUDE.md lo exige y la tarea no lo traía): token opaco de 256 bits en `__Secure-sc_refresh` (Strict, solo `/api/auth`). En la base se guarda solo su HMAC con `JWT_REFRESH_SECRET`, en la tabla nueva `AdminSession` (migración solo aditiva). Cada uso lo marca y emite otro de la misma familia; la familia vence 7 días después del login (rotar no alarga). **Reusar un token ya usado revoca toda la familia** y queda en AuditLog. Dos pestañas refrescando a la vez también cierran la sesión: aceptable con una o dos personas en el admin.
- **CSRF:** HMAC de la familia de sesión; va en `X-CSRF-Token` en todo POST/PUT/PATCH/DELETE protegido por `requireAdmin`, comparado en tiempo constante. Refresh y logout no lo exigen (la cookie Strict ya los protege, y un logout forzado solo saca al admin).
- **Bloqueo:** 5 fallos seguidos bloquean la cuenta 15 min (columnas existentes `failedLogins` y `lockedUntil`; no hizo falta la tabla `LoginAttempt` de la tarea). Mientras dure ni se prueba la contraseña. Además el límite por IP (`LOGIN_RATE_LIMIT`, 5 cada 15 min) ahora solo cuenta fallos. Ambos responden 429.
- **Sin pistas para atacantes:** misma respuesta 401 para correo desconocido y contraseña incorrecta; con un correo desconocido igual se corre argon2 contra un hash de relleno para que el tiempo no lo delate. Contraseña con tope de 256 caracteres para que argon2 no sea vector de DoS.
- **AuditLog:** `auth.login`, `auth.login_failed`, `auth.locked`, `auth.refresh_reuse` y `auth.logout`, con IP. Los logs de pino no llevan correo, contraseña ni tokens.
- **Primer admin fuera del seed:** la tarea pedía crearlo en el seed con una contraseña fija, pero el repo es público. Se hizo `npm run admin:create -- --email …`, que pide la contraseña sin eco (mínimo 12 caracteres), la hashea con argon2id y nunca pisa una cuenta existente.
- **Código:** `lib/tokens.ts` (JWT, refresh, CSRF), `services/auth.ts` (lógica sin Express), `repositories/admins.ts`, `routes/auth.ts` y `middleware/auth.ts` reescrito como inyectable (antes leía `env` al importarse y no lo usaba nadie).

## Output
- Commit `fc0c47e`.
- Verificado: 267 pruebas de la API (99 % de líneas), typecheck, lint y build. En vivo contra el MySQL local: el script rechazó una contraseña corta y un correo repetido y creó uno válido; login 200 con las dos cookies correctas; `/session` 200 con cookie y 401 sin ella; refresh 200; reusar el viejo 401 y el nuevo quedó revocado; logout 204 y refresh posterior 401; seis fallos → `401 ×4, 429, 429`; tras reiniciar la API (sin límite por IP) la contraseña correcta siguió en 429 por el bloqueo de la cuenta. AuditLog con cada evento; logs sin datos sensibles. El admin de prueba y sus filas se borraron.

## Pendiente
- [HUMANO] Crear la cuenta OWNER en producción cuando la API esté desplegada: `railway ssh` en el servicio de la API y `node dist/scripts/create-admin.js --email <correo>`; la contraseña solo se escribe ahí, sin guardarla en ningún archivo.
- La migración `admin_sessions` corre sola en Railway con `prisma migrate deploy` al arrancar.
- Limpiar periódicamente las filas de `AdminSession` vencidas (se puede sumar al agente semanal de la capa 10).
- Alertas por correo ante logins fallidos o reusos (capa 8), cuando exista Resend.
- La web del admin debe guardar el CSRF en memoria, llamar a `/session` al cargar y a `/refresh` ante un 401.

## Cross-refs
- [[2026-10-20-cotizador-de-envio-sin-perdida]] — misma sesión; el login vino después del cotizador.
- [[2026-10-17-scaffold-backend-express]] — usa su `LOGIN_RATE_LIMIT`, cookie-parser, el manejador de errores y `lib/password.ts`.
- [[2026-10-18-prisma-7-schema-y-migracion-inicial]] — usa `AdminUser` y `AuditLog` de ese esquema y le suma la migración `admin_sessions`.
- [[2026-10-20-crud-admin-auditado]] — primeras rutas que usan `requireAdmin` y el CSRF; mismo estilo `entidad.verbo` en AuditLog.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
