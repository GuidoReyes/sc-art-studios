---
type: session
area: frontend
date: 2026-10-14
slug: scaffold-frontend-nextjs-i18n
title: "Scaffold del frontend Next.js 16 con i18n, tokens y fuentes (tarea 25)"
tags: [task-master, nextjs, next-intl, tailwind, fuentes, i18n, lighthouse, csp]
status: active
related:
  - 2026-10-14-repo-publico-monorepo-y-dominio
  - 2026-10-14-gitleaks-pre-commit-y-plan-incidentes
sources:
  - repo:apps/web/i18n/routing.ts
  - repo:apps/web/proxy.ts
  - repo:apps/web/app/globals.css
  - repo:apps/web/next.config.mjs
  - repo:.github/workflows/ci.yml
superseded_by: null
---

# Scaffold del frontend Next.js 16 con i18n, tokens y fuentes (tarea 25)

## Contexto
Tarea 25: base del frontend en `apps/web` con App Router, next-intl (en/es), tokens de la paleta, fuentes Bagel Fat One y Nunito, y rutas públicas y de admin.

## Decisiones
- **Sin `create-next-app`**: habría pisado la base de la tarea 2; las piezas se agregaron a mano.
- **Next 16**: `middleware.ts` ahora se llama `proxy.ts`. **Tailwind 4**: los tokens van en `@theme` dentro de `globals.css` (no hay `tailwind.config.ts`).
- **URLs localizadas** con `pathnames` de next-intl: carpetas internas en inglés (`masks`, `custom`, `stories`, `contact`) y URL en español `/es/mascaras`, `/es/personalizada`, `/es/historias`, `/es/contacto`. Inglés por defecto (mercado EE. UU.).
- Cada layout y página llama a `setRequestLocale`; si falta en un layout, next-intl lee cabeceras y las páginas dejan de ser estáticas (pasó con el layout de marketing).
- **CSP**: sin Google Fonts (next/font las sirve desde el propio sitio); `'unsafe-eval'` solo en desarrollo; `'unsafe-inline'` queda como **riesgo aceptado** documentado en `docs/seguridad.md` hasta decidir CSP con nonces.
- **Auditoría en CI**: `braces` (vía `eslint-config-next`, solo desarrollo) tiene un advisory high sin arreglo. Producción bloquea desde high (`--omit=dev`) y el árbol completo desde critical. Volver a high cuando salga el arreglo.
- Selector de idioma sin `aria-label` (el texto visible "Español"/"English" es el nombre accesible) con `lang` y `hrefLang`.

## Output
- Commit `bf07244` (CI en verde): `app/[locale]/layout.tsx`, `(marketing)` con home y 4 páginas provisionales, `admin` con noindex (meta + `X-Robots-Tag`), `components/` (Header con enlace para saltar al contenido, Footer con "Un adulto de la familia responde los mensajes", LocaleSwitcher, PlaceholderPage), `messages/en.json` y `es.json`, `i18n/`, favicon SVG, ESLint y Vitest.
- QA: tsc, ESLint y 3 pruebas (paridad de claves en/es) en verde; 12 páginas estáticas; `/` → `/en`, `Accept-Language: es` → `/es`, `/es/masks` → `/es/mascaras`; cabecera hreflang; Lighthouse móvil: rendimiento 98, accesibilidad 100, buenas prácticas 100, SEO 100.
- Revisión con `ecc:code-reviewer`: aprobado, sin críticos ni altos; se aplicaron los ajustes menores.
- Tarea 25 y subtareas 25.1 a 25.5 en `done`.

## Pendiente
- Autenticación del admin (`/[locale]/admin` hoy es público, solo placeholder) en las tareas del backend.
- Decidir CSP con nonces antes de integrar Shopify y Turnstile.
- `metadataBase`, canonical y Open Graph en la tarea de SEO.
- `MAINTENANCE_MODE` en `proxy.ts` (pendiente desde la tarea 37).
- Quitar la sección de paleta de la home cuando exista el diseño real (cargar el skill `frontend-design`).

## Cross-refs
- [[2026-10-14-repo-publico-monorepo-y-dominio]] — base del monorepo y CSP de la plantilla sobre la que se construyó el frontend
- [[2026-10-14-gitleaks-pre-commit-y-plan-incidentes]] — el modo mantenimiento allí documentado se implementará en este proxy.ts; riesgo CSP anotado en el mismo docs/seguridad.md

## Fuentes
- [[sources#ci]]
- [[sources#seguridad]]
- [[sources#prd]]
