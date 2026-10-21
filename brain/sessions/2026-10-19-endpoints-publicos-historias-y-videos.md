---
type: session
area: backend
date: 2026-10-19
slug: endpoints-publicos-historias-y-videos
title: "Endpoints públicos de historias y videos con el contrato de /api/masks"
tags: [api, express, zod, historias, videos, cache, seguridad]
status: active
related:
  - 2026-10-19-endpoints-publicos-de-mascaras
  - 2026-10-17-scaffold-backend-express
sources:
  - repo:apps/api/src/routes/
  - repo:apps/api/src/repositories/
  - repo:packages/shared/src/content.ts
superseded_by: null
---

# Endpoints públicos de historias y videos con el contrato de /api/masks

## Contexto
Tarea 10 de Task Master (PRD §4.5): `GET /api/stories`, `GET /api/stories/:slug` y `GET /api/videos?maskId=`, para las páginas `/historias` y `/videos` y para los videos de cada ficha. Se hizo justo después de la tarea 9, en la misma sesión.

## Decisiones
- **Mismo contrato que `/api/masks`:** `page`/`limit` y `{ data, meta: { total, page, limit } }`, en lugar del `limit/offset` y `{ stories, total }` que decía la tarea. Así el frontend consume las tres APIs igual; `offset` responde 400.
- **Solo historias publicadas y con fecha cumplida.** Una historia con fecha futura cuenta como programada; ni en la lista ni por slug (404). Si la base devolviera una sin fecha, el repositorio falla en vez de publicarla.
- **Ningún enlace a una máscara en borrador:** en historias y videos el campo `mask` sale `null`. `?maskId=` de un borrador devuelve vacío, como si no existiera. Un video enlazado a una historia sin publicar sale con `story: null`. Los videos en sí ya son públicos en las redes, así que no se ocultan.
- `maskId` se valida como cuid con Zod; cualquier otro texto es 400.
- **Caché y rate limit:** iguales a la tarea 9 (`public, max-age=60, s-maxage=300` solo en 200 y el límite general de 120 por minuto en `/api`). No se usaron los 60 por minuto ni el `max-age=120` de la tarea, por la razón del SSR de Vercel registrada en [[2026-10-19-endpoints-publicos-de-mascaras]].
- **Sin duplicación entre las tres rutas:** `routes/public.ts` (paginación, slug, `no-store` por defecto, `sendPublic`, `sendNotFound`) y `repositories/links.ts` (enlace a máscara, video embebido, orden, filtro de publicadas). `masks.ts` se refactorizó para usarlos, y las constantes pasaron de `MASKS_*` a `PUBLIC_*`.
- **Tipos compartidos** en `packages/shared/src/content.ts`: `StoryListResponse`, `StoryDetailResponse`, `VideoListResponse` y el genérico `ListResponse<T>`.

## Output
- Commit `14f3b38`.
- Verificado: 121 pruebas de la API (99 % de líneas, 100 % de funciones), typecheck, lint y build. Con la API compilada contra el MySQL local, con datos temporales: solo salen las historias publicadas (la futura y la borrador dan 404), la paginación funciona, los enlaces a la máscara en borrador salen `null`, el filtro por su `maskId` sale vacío y la ficha del Jaguar trae su historia y su video. Los datos se revirtieron.

## Pendiente
- El título de un video puede nombrar una máscara que aún es borrador (por ejemplo "Lobo"). Es el mismo título que ya está publicado en la red, así que no se oculta; revisarlo en el admin si se quiere evitar.
- La sanitización del cuerpo de las historias (`sanitize-html`) se hace al guardar, en el admin (tarea de CRUD); la API pública solo lo devuelve.
- Cotizador de envío (`POST /api/shipping/quote`) y formulario de encargos.

## Cross-refs
- [[2026-10-19-endpoints-publicos-de-mascaras]] — mismo contrato, caché y criterio de borradores; `masks.ts` se refactorizó para compartir helpers.
- [[2026-10-17-scaffold-backend-express]] — usa su manejador de errores y su rate limit general de `/api`.
- [[2026-10-19-formulario-de-encargos-con-foto-segura]] — misma sesión; después vino el formulario de encargos, primera ruta pública que escribe.
- [[2026-10-20-crud-admin-auditado]] — el admin crea, programa y enlaza las historias y videos que estas rutas muestran.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
