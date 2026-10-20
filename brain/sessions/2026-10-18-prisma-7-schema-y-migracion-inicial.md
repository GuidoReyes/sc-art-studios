---
type: session
area: backend
date: 2026-10-18
slug: prisma-7-schema-y-migracion-inicial
title: "Prisma 7 con los 13 modelos del PRD y migración inicial"
tags: [prisma, mysql, schema, migraciones, mariadb-adapter, npm-audit]
status: active
related:
  - 2026-10-17-scaffold-backend-express
  - 2026-10-15-railway-mysql-y-db-local
  - 2026-10-18-guia-contadores-llc-y-stripe
sources:
  - repo:apps/api/prisma/schema.prisma
  - repo:apps/api/prisma.config.ts
  - repo:apps/api/prisma/migrations/20261018173444_init/migration.sql
  - repo:apps/api/src/lib/db.ts
  - repo:.gitignore
  - url:https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
superseded_by: null
---

# Prisma 7 con los 13 modelos del PRD y migración inicial

## Contexto
Tarea 7 de Task Master. `apps/api` traía Prisma 5.22 y un schema de plantilla con solo `AdminUser` y `AuditLog`. Dependabot proponía Prisma 7 (PR #6), y la sesión de la tarea 6 lo había dejado para este momento, antes de crear la primera migración.

## Decisiones
- **Prisma 7.10.1, no la 5 ni la 8.** La 8 sigue en RC. La 7.10.0 arrastraba vulnerabilidades altas en `mysql2` y `deepmerge-ts`, y el CI las bloquea porque el CLI corre en producción (`migrate deploy` al arrancar). La 7.10.1 ya trae las versiones corregidas.
- **Cambios que exige Prisma 7:** el generador `prisma-client` escribe en `src/generated/prisma` (ESM, imports `.js` para NodeNext), la URL pasa a `prisma.config.ts` y la conexión usa el adapter `@prisma/adapter-mariadb`.
- `prisma.config.ts` carga `.env` solo si existe (con `process.loadEnvFile`, sin `dotenv`). Usa `DATABASE_URL ?? ""` para que `prisma generate` funcione en CI sin base de datos.
- `lib/db.ts` convierte la URL en config del pool sin mostrarla nunca en los errores (lleva la contraseña). Activa `allowPublicKeyRetrieval`, que MySQL 8 necesita sin TLS (Docker local y red privada de Railway). El límite del pool (5) y el timeout (5 s) están en `config.ts`.
- **Montos y porcentajes:** `Decimal` en todos los montos. Los porcentajes se guardan como porcentaje (5.40 = 5.40 %), no como fracción. `CostSettings` está versionada: cada cambio inserta una fila y la vigente es la de `id` más alto.
- **Borrados:** `MaskImage` se borra en cascada con su máscara. Historias, videos y pedidos quedan con `SET NULL`. `ShippingRate → ShippingZone` y `AuditLog → AdminUser` usan `RESTRICT`, para no perder tarifas ni auditoría.
- **Cambio frente al PRD:** `PackagingProfile.innerCm` se partió en `innerLengthCm`, `innerWidthCm` e `innerHeightCm`, porque hacen falta tres medidas para saber si una máscara cabe.
- `Video` tiene una clave única `(platform, externalId)` para que la sincronización con las redes no duplique videos.
- `.gitignore` bloqueaba `*.sql`, así que las migraciones no se habrían subido. Se agregó una excepción para `apps/api/prisma/migrations/**/migration.sql`; los respaldos siguen bloqueados.
- El cliente se genera en `postinstall` y en `build`. `start` corre `prisma:migrate:deploy`.

## Output
- Commit `72b2b68`: schema con 13 modelos y 7 enums, migración `20261018173444_init` (13 tablas y 9 llaves foráneas), `prisma.config.ts`, `lib/db.ts` con 9 pruebas y scripts `prisma:*`.
- Verificado: migración aplicada en el MySQL local. Una prueba real con el adapter guardó y leyó `Decimal` y `Json` y confirmó el `RESTRICT`. `npm ci` limpio genera el cliente. Prisma Studio responde 200. Typecheck, lint, 43 pruebas (cobertura del 98.8 %), build y los dos `npm audit` pasan.

## Pendiente
- Cerrar la PR #6 de Dependabot: ya la cubre este commit.
- `prisma` está en devDependencies, pero `start` lo necesita en Railway. Confirmar en la tarea 22 que Railway no borre las devDependencies o moverlo a dependencies.
- Limpiar del `allowScripts` raíz las entradas viejas de Prisma 5.22.
- Falta un modelo para guardar los IDs de webhooks ya procesados (rechazo de repetidos, capa 6): va con la tarea de webhooks.
- Usuario de DB con privilegios mínimos en producción (sigue pendiente desde la tarea 6).
- Seed con los valores iniciales de `CostSettings` y tarifas (PRD §6): no es parte de esta tarea.

## Cross-refs
- [[2026-10-17-scaffold-backend-express]] — la API Express que ahora tiene cliente de DB; ahí se había dejado Prisma 7 para esta tarea.
- [[2026-10-15-railway-mysql-y-db-local]] — el MySQL local en Docker donde se aplicó la migración y el de Railway que la recibirá.
- [[2026-10-18-guia-contadores-llc-y-stripe]] — misma sesión; la decisión de pasarela cambia los valores de `CostSettings`, no el schema.
- [[2026-10-19-componentes-base-del-diseno]] — StatusPill refleja MaskStatus (sin DRAFT) y PriceTag recibe el tipo de cambio de CostSettings
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — el seed que llena estas tablas con zonas, tarifas FedEx, costos y las 4 máscaras DRAFT.

## Fuentes
- [[sources#tasks]]
- [[sources#prd]]
- [Guía de actualización a Prisma 7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- `apps/api/prisma/schema.prisma`
