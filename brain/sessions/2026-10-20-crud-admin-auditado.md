---
type: session
area: backend
date: 2026-10-20
slug: crud-admin-auditado
title: "CRUD del admin para máscaras, historias y videos con AuditLog en la misma transacción"
tags: [api, admin, crud, auditoria, zod, sanitize-html, rate-limit]
status: active
related:
  - 2026-10-20-login-admin-refresh-rotativo-csrf
  - 2026-10-19-endpoints-publicos-de-mascaras
  - 2026-10-19-endpoints-publicos-historias-y-videos
  - 2026-10-18-prisma-7-schema-y-migracion-inicial
sources:
  - repo:apps/api/src/routes/admin/
  - repo:apps/api/src/repositories/admin/
  - repo:apps/api/src/lib/richText.ts
  - repo:apps/api/src/lib/videoUrls.ts
  - repo:packages/shared/src/admin.ts
superseded_by: null
---

# CRUD del admin para máscaras, historias y videos con AuditLog en la misma transacción

## Contexto
Tarea 14 de Task Master: rutas protegidas `/api/admin/{masks,stories,videos}` para listar, ver, crear, actualizar (PUT parcial) y eliminar. Primera parte del admin que escribe contenido; la usarán el panel (fase 5), el motor de precios (tarea 15) y la publicación en Shopify (tarea 20).

## Decisiones
- **Acceso:** todo `/api/admin` pasa por `requireAdmin(OWNER, EDITOR)` de [[2026-10-20-login-admin-refresh-rotativo-csrf]], con CSRF en POST/PUT/DELETE y `Cache-Control: no-store`. Límite de 30/min **por usuario** (`ADMIN_RATE_LIMIT`), no por IP; va después de `requireAdmin` porque la llave es el id de la sesión. `createLimiter` ganó un `keyGenerator` opcional.
- **Auditoría en la misma transacción:** un store genérico (`repositories/admin/store.ts`) hace el cambio y su `AuditLog` juntos; si falla la auditoría, no hay cambio. Acciones `mask.create|update|delete` (mismo estilo `entidad.verbo` que `auth.login`, no `CREATE_MASK` como decía la tarea). `diff`: `{after}` al crear, `{before, after}` solo de lo que cambió al actualizar (sin `updatedAt`; un PUT que no cambia nada no se audita) y `{before}` completo al borrar. Lo rechazado (409/422) no deja fila.
- **Errores de Prisma traducidos:** P2002 → 409 `DUPLICATE` (slug o video repetido), P2003 → 422 `INVALID_REFERENCE` (máscara, historia o caja inexistente), P2025 → 404. Verificado en vivo con el adapter MariaDB. Nuevo `HttpError` (status, mensaje, código) que el manejador de errores muestra tal cual.
- **Borrar máscara:** no si está SOLD (`MASK_SOLD`), RESERVED (`MASK_RESERVED`) o ya tiene producto en Shopify (`MASK_IN_SHOPIFY`, para no dejarlo huérfano). La condición se repite en el `WHERE` del `deleteMany`: si un webhook la vende entre la lectura y el borrado, no se borra (409 `CHANGED`). EDITOR también puede borrar máscaras (la restricción del PRD es sobre pedidos).
- **Máscaras:** un borrador puede ir incompleto; solo nombres, animal y descripciones son obligatorios. Sin slug se arma con el nombre en inglés. Peso y medidas con los topes del cotizador; decimales validados contra la precisión de cada columna (`decimal(10, 2)` etc.), no con montos inventados. Los IDs de Shopify y `publishedAt` no se aceptan: los fija la publicación (tarea 20). Campos con los nombres de las columnas (`lengthCm`…, no un objeto `dims`), para que el diff de auditoría sea directo.
- **Historias:** el cuerpo se limpia con `sanitize-html` 2.18.0 antes de guardarse (solo formato y enlaces; los enlaces salen con `rel="noopener noreferrer nofollow"` y `target="_blank"` forzados). Si queda vacío, 400. `publishedAt` con zona horaria; null = borrador, futura = programada. La portada (`coverR2Key`) no se acepta a mano: llegará con la subida a R2.
- **Videos:** el admin pega el enlace y la API deduce plataforma, id y una URL canónica sin parámetros de rastreo (YouTube, TikTok con cuenta, Instagram reel/p/tv). Enlaces cortos `vm.tiktok.com` se rechazan (no se pueden resolver sin pedir a TikTok). `source` siempre `MANUAL`; `platform` y `source` no se aceptan del cliente. La tarea pedía `titleEs/En` y `durationSeconds`, que el modelo no tiene.
- **Dependencias:** `sanitize-html@2.18.0` y `@types/sanitize-html@2.16.2` fijas (la 2.18.1 tenía 6 días); todas las transitivas tienen más de 2 semanas.

## Output
- Commit `040ba44`.
- Verificado: 360 pruebas de la API (98.4 % de líneas), typecheck, lint y build. En vivo contra el MySQL local con un EDITOR de prueba: sin sesión 401, sin CSRF 403; crear máscara 201 (slug `qa-owl`), slug repetido 409, caja inexistente 422; listar DRAFT y ver con costos; PUT parcial; pasar a SOLD y borrar → 409 `MASK_SOLD`; historia con `<script>`/`onclick`/`javascript:` guardada limpia; programada a 2030 no sale en `/api/stories`; video de TikTok con id deducido, repetido 409; borrar la historia deja el video sin historia (SetNull); 30 GET → 200 y el 31 → 429. AuditLog con las 13 acciones y sus diffs. Todo lo de prueba se borró (quedan las 4 máscaras del seed).

## Pendiente
- Fotos de máscara (`MaskImage`) y portada de historia: subida a R2 con sharp (tarea aparte). Al borrar una máscara sus filas de imágenes se borran en cascada, pero los objetos en R2 quedarán huérfanos: limpiarlos cuando exista la subida.
- Cambiar el estado a AVAILABLE a mano no publica en Shopify: eso será `POST /api/admin/masks/:id/publish` (tarea 20).
- El panel debe mostrar los mensajes de error por `code` (`MASK_SOLD`, `DUPLICATE`, `INVALID_REFERENCE`…).

## Cross-refs
- [[2026-10-20-login-admin-refresh-rotativo-csrf]] — usa su `requireAdmin`, el CSRF por sesión y el estilo de acciones de AuditLog.
- [[2026-10-19-endpoints-publicos-de-mascaras]] — la cara pública de las mismas máscaras; comparten `pageQueryShape`, slug y el criterio de borradores.
- [[2026-10-19-endpoints-publicos-historias-y-videos]] — lo que aquí se programa o publica es lo que esas rutas muestran.
- [[2026-10-18-prisma-7-schema-y-migracion-inicial]] — escribe en `Mask`, `Story`, `Video` y `AuditLog` de ese esquema, sin migraciones nuevas.
- [[2026-10-21-motor-de-precios-sugeridos]] — el motor de precios vive bajo este /api/admin; el precio que sugiere se guarda con este CRUD.
- [[2026-10-27-panel-admin-login-y-resumen]] — suma `GET /api/admin/dashboard` a este router y el panel que consumirá estos CRUD.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
