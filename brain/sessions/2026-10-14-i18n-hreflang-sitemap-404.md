---
type: session
area: frontend
date: 2026-10-14
slug: i18n-hreflang-sitemap-404
title: "i18n completa: hreflang, sitemap, 404 traducido y claves tipadas (tarea 38)"
tags: [task-master, next-intl, i18n, seo, hreflang, sitemap, tdd]
status: active
related:
  - 2026-10-14-scaffold-frontend-nextjs-i18n
sources:
  - repo:apps/web/lib/seo.ts
  - repo:apps/web/i18n/routing.ts
  - repo:apps/web/global.d.ts
  - repo:apps/web/app/sitemap.ts
superseded_by: null
---

# i18n completa: hreflang, sitemap, 404 traducido y claves tipadas (tarea 38)

## Contexto
Tarea 38: la mayor parte (proxy con Accept-Language, mensajes, selector que conserva la ruta) ya venía de la tarea 25. Se cubrió la brecha: SEO multilingüe, 404 traducido, cookie persistente y tipado de claves.

## Decisiones
- **Sin banderas** en el selector (la tarea las pedía): un idioma no es un país (español ≠ Guatemala) y los emojis de bandera no se ven en Windows. Se mantiene el nombre del idioma ("Español"/"English"). Fácil de agregar si se decide lo contrario.
- **x-default** = URL sin prefijo (`/masks`), igual que la cabecera `Link` que emite next-intl, para no mandar señales contradictorias a Google.
- `SITE_URL` sale de `NEXT_PUBLIC_SITE_URL` (con `||`, para que una variable vacía no rompa la build); por defecto `https://scartstudios.com`.
- Cookie `NEXT_LOCALE` con `maxAge` de un año (funcional, sin datos personales).
- **Claves tipadas** con `AppConfig` de next-intl: `t("clave-inexistente")` y `locale: string` ya son errores de TypeScript; `asLocale()` valida el segmento de la URL.
- **404**: status 404 + `noindex` + página traducida. Next 16 sirve el envoltorio `<html id="__next_error__">` sin `lang` porque el layout raíz es el segmento dinámico `[locale]`; la única salida es `global-not-found` (experimental). Aceptado.

## Output
- Commit `3a26ea0` (CI en verde): `lib/seo.ts` + 11 pruebas (TDD: RED → GREEN), `vitest.config.mts`, `global.d.ts`, `app/sitemap.ts` (10 URLs con alternativas), `app/robots.ts` (sin `/en/admin`, `/es/admin`), `app/[locale]/not-found.tsx` + ruta comodín, mensajes `NotFound` y `Masks` (estados disponible/vendida/en proceso).
- QA en ejecución: `/` redirige según Accept-Language (en, es, fr→en); canonical, hreflang y `og:locale` en `/es/mascaras`; cookie `Max-Age=31536000`.
- Revisión `ecc:code-reviewer`: aprobado; se aplicó el arreglo de la variable vacía.
- Tarea 38 y subtareas 38.1 a 38.4 en `done`.

## Pendiente
- Open Graph por página (`url`, `title`, `description`) e imagen OG en la tarea de SEO.
- `lastModified` en el sitemap cuando haya contenido real (máscaras e historias dinámicas).
- Revisar `global-not-found` cuando deje de ser experimental.

## Cross-refs
- [[2026-10-14-scaffold-frontend-nextjs-i18n]] — la tarea 25 montó next-intl; esta completa SEO, 404 y tipado

## Fuentes
- [[sources#prd]]
