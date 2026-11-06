---
type: session
area: frontend
date: 2026-11-06
slug: admin-historias-y-videos-oembed
title: "Admin: videos con oEmbed e historias con portada a R2"
tags: [frontend, backend, admin, oembed, r2, sharp, sanitize-html, videos, historias]
status: active
related:
  - 2026-10-27-panel-admin-login-y-resumen
superseded_by: null
sources:
  - repo:apps/api/src/services/oembed.service.ts
  - repo:apps/api/src/routes/admin/oembed.ts
  - repo:apps/api/src/routes/admin/stories.ts
  - repo:apps/api/src/lib/images.ts
  - repo:apps/web/components/admin/content
---

# Admin: videos con oEmbed e historias con portada a R2

Tarea 41 (PRD 5.6, 7.1).

## Qué quedó
- `POST /api/admin/oembed/resolve { url }` → `{ platform, externalId, url, title, thumbnailUrl, embedHtml, partial }`.
  YouTube y TikTok por su oEmbed público; Instagram por la Graph API de Meta solo si hay `INSTAGRAM_OEMBED_TOKEN`.
- Timeout 5 s por intento, 3 intentos con espera 300/600 ms; solo reintenta red, timeout, 429 y 5xx. Un 4xx o el fallo final
  no rompen el alta: devuelve datos mínimos (`partial: true`, miniatura `i.ytimg.com/vi/<id>/hqdefault.jpg` para YouTube).
- Miniatura: si hay `R2_PUBLIC_BUCKET` + `R2_PUBLIC_URL`, se baja, se re-codifica con sharp (WebP 640 px, sin EXIF) y se sube
  a `videos/<red>-<hash>.webp`. Sin R2 o si falla, queda la URL remota (TikTok/Instagram firman y caducan sus URLs).
- `POST /api/admin/stories/:id/cover` (multipart `cover`, 8 MB): WebP 1200×630 recortado al centro, sin EXIF, clave nueva
  `stories/<id>-<ts>.webp`, borra la anterior. 503 sin R2 público.
- Web: `/admin/videos` (pegar → buscar → vista previa → guardar, filtro por máscara, editar/borrar) y `/admin/historias`
  (`/admin/stories` en inglés): títulos ES/EN, slug automático, editor HTML con botones, máscara, publicar, portada.
- Selectores de máscara: solo las no-DRAFT. La ficha pública de máscara ya traía videos e historias relacionados (tarea 28).

## Decisiones
- Sin migración: `embedHtml` no se guarda (la web arma su iframe con `externalId`); no hay excerpt ni status (borrador = `publishedAt` null).
- La whitelist de sanitize-html es la de la tarea 14 (incluye b/i/u/s/h4/mailto además de lo que pedía la 41).
- Duplicados: `@@unique([platform, externalId])` → 409 DUPLICATE.

## Pendiente
- Crear el bucket público de R2 y su dominio (p. ej. media.scartstudios.com) y agregar ese dominio a `img-src` de la CSP
  y a `images.remotePatterns` de Next; hoy solo están `*.r2.dev` e `i.ytimg.com`, así que miniaturas de TikTok/Instagram
  remotas no se ven en el admin.
- Token de Meta para Instagram.
