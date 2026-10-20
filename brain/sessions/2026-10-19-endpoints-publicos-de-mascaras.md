---
type: session
area: backend
date: 2026-10-19
slug: endpoints-publicos-de-mascaras
title: "Endpoints públicos de máscaras sin borradores ni costos"
tags: [api, express, zod, mascaras, cache, seguridad]
status: active
related:
  - 2026-10-19-seed-tarifas-fedex-y-costos
  - 2026-10-17-scaffold-backend-express
  - 2026-10-19-componentes-base-del-diseno
sources:
  - repo:apps/api/src/routes/masks.ts
  - repo:apps/api/src/repositories/masks.ts
  - repo:packages/shared/src/masks.ts
superseded_by: null
---

# Endpoints públicos de máscaras sin borradores ni costos

## Contexto
Tarea 9 de Task Master (PRD §4.5): `GET /api/masks` y `GET /api/masks/:slug` para el catálogo y la ficha. Antes, en la misma sesión, se revisó y unió con squash la PR #9 (HS256 fijo en JWT, Node 22.12, `allowScripts`), resolviendo un conflicto en `vitest.config.ts` con un merge de `main` en la rama, sin force-push.

## Decisiones
- **Los borradores nunca son públicos.** La prueba de la tarea esperaba que `?status=DRAFT` devolviera las 4 máscaras del seed, pero eso publicaría borradores. Sin filtro se excluye `DRAFT`; pedirlo responde 400 y el slug de un borrador responde 404, igual que uno inexistente. Si la base devolviera un borrador, el repositorio falla en vez de publicarlo.
- **Costos fuera de la respuesta:** `select` explícito, así `materialsCostGtq`, `laborHours` y el empaque ni se leen.
- **Rate limit:** la tarea pedía 60 por minuto para estas rutas, pero el límite general de `/api` ya es de 120 por minuto por IP y se dejó holgado a propósito por el SSR de Vercel, que llama desde pocas IPs. No se agregó otro.
- **Caché:** `public, max-age=60, s-maxage=300` solo en respuestas 200; los 400 y 404 van con `no-store` para que la CDN no guarde errores.
- **Validación:** Zod estricto (un parámetro desconocido es 400), un solo estado, `limit` hasta 48, `page` hasta 1000 (para evitar un OFFSET enorme) y slug en minúsculas con guiones.
- **Repositorio inyectado** en `createApp` (`masks?: MaskRepository`): las rutas se prueban con supertest sin base de datos y la implementación con Prisma tiene sus propias pruebas.
- **Forma de la respuesta:** `{ data, meta: { total, page, limit } }`. Los textos van como `{ es, en }`, las fotos como llave de R2 (el frontend arma la URL), los decimales como números y las fechas en ISO. El detalle solo trae historias ya publicadas.
- **Tipos compartidos** en `packages/shared/src/masks.ts` (`MaskListResponse`, `MaskDetailResponse`). La API los importa solo con `import type`, así el build no necesita cargar el paquete en tiempo de ejecución.

## Output
- Commit `470144e`: `routes/masks.ts`, `repositories/masks.ts`, tipos compartidos, rutas conectadas en `app.ts` e `index.ts` (que también cierra Prisma al apagar).
- Commit `e7dbb22`: squash de la PR #9.
- Verificado: 97 pruebas de la API (cobertura 99 %), typecheck, lint y build. Con la API compilada contra el MySQL local: borradores ocultos, y con una máscara publicada temporalmente las fotos salen ordenadas, solo aparece la historia publicada (no la futura ni el borrador) y los costos no salen. Filtros y paginación funcionan, y el request 121 recibe 429. Los datos de prueba se revirtieron.

## Pendiente
- `/api/stories`, `/api/videos` y el cotizador de envío (tarea 10 y siguientes).
- La web todavía usa su propio `PublicMaskStatus` en `apps/web/lib/mask.ts`; unificarlo con el tipo compartido cuando la web consuma esta API.
- Paquetes con script de instalación que no están en `allowScripts` (`@parcel/watcher`, `@swc/core`, `fsevents`, `unrs-resolver`): ya faltaban antes de la PR #9.
- Borrar la rama remota `bot/fix-versiones-jwt` si ya no se usa.

## Cross-refs
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — las 4 máscaras del seed son DRAFT, por eso la lista pública sale vacía hasta publicarlas.
- [[2026-10-17-scaffold-backend-express]] — usa el manejador de errores (ZodError → 400) y el rate limit general de `/api` de ese scaffold.
- [[2026-10-19-componentes-base-del-diseno]] — `MaskCard` y la ficha consumirán estos DTO.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
