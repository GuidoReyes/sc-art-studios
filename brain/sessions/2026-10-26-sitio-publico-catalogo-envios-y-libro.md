---
type: session
area: frontend
date: 2026-10-26
slug: sitio-publico-catalogo-envios-y-libro
title: "Sitio público: inicio, catálogo, ficha con estimador de envío, historias, videos y Sobre Scarlett en modo libro"
tags: [frontend, nextjs, catalogo, envios, historias, videos, libro, isr, privacidad]
status: active
related:
  - 2026-10-19-componentes-base-del-diseno
  - 2026-10-19-endpoints-publicos-de-mascaras
  - 2026-10-19-endpoints-publicos-historias-y-videos
  - 2026-10-20-cotizador-de-envio-sin-perdida
  - 2026-10-14-i18n-hreflang-sitemap-404
sources:
  - repo:apps/web/lib/api.ts
  - repo:apps/web/lib/catalog.ts
  - repo:apps/web/lib/catalogQuery.ts
  - repo:apps/web/lib/shippingQuote.ts
  - repo:apps/web/components/BookViewer.tsx
  - repo:apps/web/components/ShippingEstimator.tsx
  - repo:apps/web/app/[locale]/(marketing)
superseded_by: null
---

# Sitio público: inicio, catálogo, ficha con estimador de envío, historias, videos y Sobre Scarlett en modo libro

## Contexto
Tareas 28, 29 y 31 de Task Master (fase 4). El usuario pidió ver cómo queda la página y dejar Shopify/PayPal para el final, así que la 28 quedó **en curso**: todo menos el carrito. Las páginas consumen la API pública de [[2026-10-19-endpoints-publicos-de-mascaras]] y [[2026-10-19-endpoints-publicos-historias-y-videos]] con los componentes de [[2026-10-19-componentes-base-del-diseno]].

## Decisiones
- **Datos del lado del servidor** con `apiGet` (ISR 60 s, timeout 5 s, 404 → `null`). Inicio, historias y videos usan `orFallback`: si la API cae, la página sale vacía y se regenera sola; el build no depende de la API. La ficha y el catálogo usan el `error.tsx` del grupo marketing.
- **Catálogo:** filtros por estado y animal en la URL, validados con Zod `.catch` (valores inválidos se ignoran); 12 por página y la página 1 no va en la URL.
- **Ficha:** JSON-LD Product (oferta solo con precio publicado, `<` escapado), botón de compra deshabilitado "muy pronto" + WhatsApp mientras llega Shopify, y "Quiero una parecida" → `/custom?ref=slug`. `priceUsd` puede ser `null` ("precio pronto").
- **Estimador de envío (29):** componente cliente que llama directo a `POST /api/shipping/quote` de [[2026-10-20-cotizador-de-envio-sin-perdida]]; `connect-src` de la CSP sale de `NEXT_PUBLIC_API_URL`. 12 países sugeridos, resultado en `aria-live`, aviso de aranceles. Página `/envios` con zonas, aranceles, empaque y daños.
- **Sobre Scarlett (31):** port del prototipo del artifact a `BookViewer` (hojas con `rotateY`, dos páginas en escritorio y una bajo 720 px, teclado y swipe, caras ocultas con `inert`). **Se quitó el grado escolar** del prototipo (regla de protección de la menor); quedan nombre, edad y gustos.
- **Fotos del libro** en `public/book/*.webp`: re-codificadas con sharp, sin EXIF/ICC/XMP, solo máscaras. En producción las fotos de máscaras salen de R2 vía `NEXT_PUBLIC_MEDIA_URL`.
- `buildAlternates`/`localizedPath` aceptan parámetros (`[slug]`) y fallan si falta uno.

## Output
- Commits `e66f1b8` (28), `2290ee2` (29), `5a6af90` (31).
- Verificado: 68 pruebas web, typecheck, lint y `next build` (también con la API caída); axe sin violaciones en escritorio y móvil, sin errores de consola ni desborde horizontal.
- Datos de demostración solo en la DB local (4 máscaras publicadas, imágenes `demo-img-*`, historia `de-bloque-a-jaguar`).

## Pendiente
- Tarea 28: carrito y compra con Shopify (al final, con 16/17/19–21/27/39).
- El usuario debe definir `NEXT_PUBLIC_WHATSAPP_NUMBER` y revisar los textos escritos por Claude ("Si llega dañada", "Conoce a Scarlett", textos del libro en primera persona).
- Con la caja supuesta (3 kg volumétricos) el envío a EE. UU. sale ~US$245: revisar el perfil de empaque real antes de publicar.

## Cross-refs
- [[2026-10-19-componentes-base-del-diseno]] — MaskCard, StatusPill, PriceTag y Header que estas páginas usan; `placeholderSurface` pasó a `lib/mask.ts`.
- [[2026-10-19-endpoints-publicos-de-mascaras]] — inicio, catálogo y ficha consumen sus DTO.
- [[2026-10-19-endpoints-publicos-historias-y-videos]] — `/historias`, `/historias/[slug]` y `/videos` consumen estas rutas.
- [[2026-10-20-cotizador-de-envio-sin-perdida]] — el estimador de la ficha llama a este cotizador desde el navegador.
- [[2026-10-14-i18n-hreflang-sitemap-404]] — nuevas rutas `/historias/[slug]` y `/sobre-scarlett` en el routing, hreflang y sitemap.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
