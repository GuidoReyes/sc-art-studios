---
type: session
area: frontend
date: 2026-10-19
slug: componentes-base-del-diseno
title: "Componentes base del diseño con contraste AA y página de prueba"
tags: [componentes, tailwind, accesibilidad, wcag, i18n, whatsapp, precios]
status: active
related:
  - 2026-10-14-scaffold-frontend-nextjs-i18n
  - 2026-10-14-i18n-hreflang-sitemap-404
  - 2026-10-18-prisma-7-schema-y-migracion-inicial
  - 2026-10-14-repo-publico-monorepo-y-dominio
sources:
  - repo:apps/web/components/
  - repo:apps/web/lib/palette.ts
  - repo:apps/web/lib/price.ts
  - repo:apps/web/lib/whatsapp.ts
  - repo:apps/web/app/globals.css
  - repo:apps/web/i18n/routing.ts
  - url:https://simpleicons.org
superseded_by: null
---

# Componentes base del diseño con contraste AA y página de prueba

## Contexto
Tarea 26 de Task Master: los bloques con los que se arma cada página (PRD §3). Antes, en la misma sesión, se subieron los commits de la tarea 7, se cerró la PR #6 de Dependabot y se cerró la tarea 4: el dominio se compró en Cloudflare Registrar, así que la zona y los nameservers ya estaban activos (verificado con `whois`, `dig NS` y `dig SOA`) y no hubo que pasar por Vercel.

## Decisiones
- **Rosa de marca y accesibilidad:** `#E8307A` no pasa WCAG AA para texto normal con ningún color (4.21:1 con tinta, 3.82:1 con crema). Se agregó `pink-deep` `#C2255F` (5.26:1 con crema) para fondos con texto; el rosa original queda para acentos y subrayados. `lib/palette.ts` define las superficies (fondo + texto) y una prueba verifica el contraste de cada una y que los colores coincidan con `globals.css`.
- **Estilo:** se mantiene el lenguaje del PRD (píldoras, bordes de 4px, radios grandes) y se agrega una sombra dura desplazada (`shadow-sticker`) tipo calcomanía. La etiqueta de estado va girada sobre la foto. Las animaciones respetan `prefers-reduced-motion`.
- **Estados:** los mismos de `MaskStatus` en Prisma menos `DRAFT`. Disponible = turquesa, reservada = naranja, vendida = crema, ejemplo de encargo = morado. Vendidas y ejemplos no muestran precio, sino "Pide una parecida".
- **Precios:** `PriceTag` recibe el tipo de cambio por prop (vendrá de `CostSettings`) y solo muestra quetzales si se lo pasan; nada fijo en el código. Formato `US$95` y `aprox. Q726`.
- **WhatsApp:** el número del adulto responsable va en `NEXT_PUBLIC_WHATSAPP_NUMBER` (Vercel), nunca en el repo. Sin número, el botón no se muestra.
- **Redes:** `SOCIAL_LINKS` está vacío hasta que existan las cuentas (vendrán de `SocialAccount`); el pie las oculta mientras tanto. Solo se aceptan enlaces https. Los íconos de marca son de Simple Icons (CC0) en SVG local; `lucide-react` solo para menú, cerrar y carrito.
- **Carrito:** `CartIndicator` solo muestra el conteo (vacío por ahora); el carrito real llega con la tarea de Storefront API.
- **Rutas nuevas** (con página "Muy pronto" y en el sitemap): `/videos`, `/envios`, `/privacidad`, `/terminos`. Se agregó `/mascaras/[slug]` al routing para que `MaskCard` enlace con tipos; la ficha todavía responde 404.
- **Selector de idioma** con bandera decorativa (`aria-hidden`) y `useParams` para conservar el slug en rutas dinámicas.
- `/test-components` solo existe en desarrollo (404 en producción, `noindex`).
- `next.config.mjs` permite imágenes de `cdn.shopify.com` y `*.r2.dev`, igual que la CSP.

## Output
- Commit `55faf21`: Header (menú móvil con Escape y `aria-expanded`, `aria-current` en la sección actual), Footer, MaskCard, StatusPill, PriceTag, SectionBlock, WhatsAppButton, SocialLinks, CartIndicator, NavLink, `lib/{palette,price,whatsapp,social,mask,site}.ts`.
- Commit `ea94093`: cierre de la tarea 4.
- Verificado: 47 pruebas en web (lógica, contraste y render), typecheck, lint, build y `npm audit --omit=dev` en 0. En el navegador (Chromium headless con axe-core), cero violaciones WCAG A/AA en escritorio y en móvil con el menú abierto, sin desborde horizontal a 390px y sin errores de consola. Con `next start`, `/test-components` da 404 y el sitemap tiene 18 URLs.

## Pendiente
- Ficha `/mascaras/[slug]` (la enlaza `MaskCard`): tarea del catálogo.
- Llenar `SOCIAL_LINKS` cuando existan las cuentas de marca y definir `NEXT_PUBLIC_WHATSAPP_NUMBER` en Vercel.
- Conectar `CartIndicator` al carrito de Shopify.
- 5 alertas altas de desarrollo (`braces` vía `eslint-config-next`), anteriores a este cambio; el CI solo bloquea las críticas en desarrollo.
- En esta Mac no hay Google Chrome, así que el MCP de chrome-devtools no funciona. Se usó el Chromium de Playwright que estaba en la caché.

## Cross-refs
- [[2026-10-14-scaffold-frontend-nextjs-i18n]] — el scaffold con tokens, fuentes y Header/Footer iniciales que esta tarea reemplaza.
- [[2026-10-14-i18n-hreflang-sitemap-404]] — las rutas nuevas usan el mismo routing tipado, hreflang y sitemap.
- [[2026-10-18-prisma-7-schema-y-migracion-inicial]] — `StatusPill` usa los estados de `MaskStatus` y `PriceTag` espera el tipo de cambio de `CostSettings`.
- [[2026-10-14-repo-publico-monorepo-y-dominio]] — la tarea 4 (DNS) se cerró aquí sobre el dominio comprado en esa sesión.
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — el seed carga el tipo de cambio de CostSettings que PriceTag recibirá.
- [[2026-10-19-endpoints-publicos-de-mascaras]] — la API que alimentará MaskCard y la ficha, con tipos en @sc-art-studio/shared.
- [[2026-10-26-sitio-publico-catalogo-envios-y-libro]] — inicio, catálogo, ficha, historias y Sobre Scarlett usan estos componentes.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
- [Simple Icons](https://simpleicons.org) (CC0-1.0)
