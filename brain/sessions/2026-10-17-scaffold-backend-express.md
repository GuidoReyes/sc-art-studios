---
type: session
area: backend
date: 2026-10-17
slug: scaffold-backend-express
title: "Scaffold del backend Express: seguridad, logs, /health y pruebas"
tags: [express, helmet, cors, rate-limit, pino, zod, vitest, dependabot]
status: active
related:
  - 2026-10-15-railway-mysql-y-db-local
  - 2026-10-14-repo-publico-monorepo-y-dominio
sources:
  - repo:apps/api/src/app.ts
  - repo:apps/api/src/config.ts
  - repo:apps/api/src/middleware/security.ts
  - repo:apps/api/src/lib/logger.ts
  - repo:apps/api/src/lib/env-schema.ts
superseded_by: null
---

# Scaffold del backend Express: seguridad, logs, /health y pruebas

## Contexto
Tarea 6 de Task Master. `apps/api` ya traía de la plantilla MEA las piezas `env`, `password`, `webhooks`, `auth`, `errors` y `security`. Se auditaron y se completaron hasta cumplir la tarea: Helmet, CORS, rate limiting, Pino, `/health` y scripts.

## Decisiones
- **Dependencias al día antes de crecer:** Express 5.3, express-rate-limit 8.7, Zod 4.6 (también en shared y web), argon2 0.45 y pino-http 11. Cubren las PRs de Dependabot #4, #5, #7 y #8. Prisma 7 (#6) queda para la tarea 7.
- `createApp(options)` vive en `app.ts`, separado de `index.ts` (listen y apagado ante SIGTERM), para probar con supertest sin abrir puertos.
- CSP de API: `default-src 'none'`, `frame-ancestors 'none'` y `X-Frame-Options: DENY`.
- **Rate limit general de 120/min en `/api`**, no los 100/15 min que pedía la tarea: el SSR de Vercel llama desde pocas IPs compartidas. Hay limitadores estrictos exportados para login (5/15 min), formularios (10/h) y cotizador (20/min). `/health` no se limita.
- Logs: el serializer guarda solo id, método y ruta, sin query string, cabeceras ni IP. Se redactan password, token, cookie y authorization.
- `parseEnv` nombra las variables inválidas sin mostrar sus valores y trata `VAR=` vacío como no definido.
- Sin `dotenv`: en desarrollo se usa `tsx watch --env-file=.env`; en producción, las variables de Railway.
- Puerto por defecto 8080, como pide la tarea; Railway inyecta `PORT`.
- El build usa `tsconfig.build.json`, que excluye los tests de `dist`.

## Output
- Archivos nuevos: `app.ts`, `config.ts`, `lib/logger.ts`, `lib/env-schema.ts`, `vitest.config.ts` (umbral de cobertura del 80 %) y `tsconfig.build.json`.
- 34 pruebas: app, errors, logger, env, webhooks HMAC y argon2id. Cobertura del 98,6 % en sentencias y 100 % en líneas. `auth.ts` queda fuera de la cobertura hasta la tarea 13.
- La revisión de código aprobó con 4 puntos medios, aplicados: `FRONTEND_URL` normalizado a origen, `headersSent`, secretos JWT distintos, apagado idempotente y pruebas extra.
- Verificado con el servidor real: `/health` responde 200 con cabeceras, CORS autoriza el propio y bloquea el ajeno, los logs salen en JSON sin el correo de la query, el apagado es limpio y `npm run dev:api` funciona.

## Pendiente
- Prisma 7 y el esquema: tarea 7.
- Usuario de DB con privilegios mínimos al desplegar.
- Rutas públicas y de admin, y auth: tareas 9–13.
- Las PRs de Dependabot #1–#3 (GitHub Actions) siguen abiertas.
- **Decidir antes de las tareas 11 y 13:** los limitadores estrictos cuentan por IP, y si login y formularios pasan por el SSR de Vercel todos comparten IP. Opciones en docs/seguridad.md, capa 5.

## Cross-refs
- [[2026-10-15-railway-mysql-y-db-local]] — base local y de Railway que usará esta API.
- [[2026-10-14-repo-publico-monorepo-y-dominio]] — monorepo y CI.
- [[2026-10-18-prisma-7-schema-y-migracion-inicial]] — tarea 7: Prisma 7 y el schema que dejó pendiente esta sesión.
- [[2026-10-19-endpoints-publicos-de-mascaras]] — primeras rutas públicas sobre este scaffold: usan su manejador de errores y su rate limit de /api.
- [[2026-10-19-endpoints-publicos-historias-y-videos]] — más rutas públicas sobre este scaffold, con su manejador de errores y su rate limit.

## Fuentes
- repo:apps/api/src/app.ts
- repo:apps/api/src/middleware/security.ts
