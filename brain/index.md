# brain — Índice

> Catálogo de nodos. Un one-liner por nodo. Organizado por tipo y luego por área.
> Para operar este wiki, leé `CLAUDE.md` en este directorio.
> Al hacer queries, leé este archivo primero para decidir qué nodos abrir.

**Última actualización:** 2026-10-26
**Total de nodos:** 19 sesiones | 0 conceptos | 0 ADRs

---

## Sesiones

### backend

- [[2026-10-21-motor-de-precios-sugeridos]] — Tarea 15: POST /api/admin/pricing/suggest con costo unitario y precio por margen (objetivo ± 10 de CostSettings), Decimal y redondeo hacia arriba
- [[2026-10-20-crud-admin-auditado]] — Tarea 14: /api/admin/{masks,stories,videos} con requireAdmin, CSRF, 30/min por usuario, AuditLog en la misma transacción, sin borrar vendidas
- [[2026-10-20-cotizador-de-envio-sin-perdida]] — Tarea 12: POST /api/shipping/quote con peso volumétrico, tramo más ajustado y cobro ÷ (1 − 7.4 %) hacia arriba; sin exponer costos
- [[2026-10-19-formulario-de-encargos-con-foto-segura]] — Tarea 11: POST /api/custom-requests con Zod, Turnstile, foto por la API re-codificada sin EXIF a R2 privado
- [[2026-10-19-endpoints-publicos-historias-y-videos]] — Tarea 10: /api/stories, /:slug y /api/videos con el contrato de masks; solo historias publicadas y sin enlaces a borradores
- [[2026-10-19-endpoints-publicos-de-mascaras]] — Tarea 9: GET /api/masks y /:slug sin borradores ni costos, Zod estricto, caché solo en 200, tipos en shared; PR #9 unida
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — Tarea 8: seed que solo crea lo que falta: 3 zonas y 18 tarifas FedEx, CostSettings (PayPal 5.40 + Shopify 2.00), empaque supuesto, 4 máscaras DRAFT
- [[2026-10-18-prisma-7-schema-y-migracion-inicial]] — Tarea 7: Prisma 7.10.1 + adapter MariaDB, 13 modelos y migración init, 43 pruebas (98.8 %)
- [[2026-10-17-scaffold-backend-express]] — Tarea 6: Express 5 + Helmet/CORS/rate limit, Pino sin datos personales, /health, 34 pruebas (98 %)

### comercio

*(vacío)*

### docs

- [[2026-10-14-reglas-claude-md-y-agents-md]] — Tarea 3: stack, 13 capas de seguridad, protección de la menor, commits y agentes en CLAUDE.md/AGENTS.md

### frontend

- [[2026-10-26-sitio-publico-catalogo-envios-y-libro]] — Tareas 28, 29 y 31: inicio, catálogo con filtros, ficha con estimador de envío, /envios, historias, videos y Sobre Scarlett en modo libro (sin grado escolar); carrito pendiente
- [[2026-10-19-componentes-base-del-diseno]] — Tarea 26: Header/Footer/MaskCard y demás componentes, pink-deep para WCAG AA, /test-components, 47 pruebas + axe sin violaciones
- [[2026-10-14-i18n-hreflang-sitemap-404]] — Tarea 38: hreflang/canonical/og:locale, sitemap y robots, 404 traducido, cookie de idioma, claves tipadas
- [[2026-10-14-scaffold-frontend-nextjs-i18n]] — Tarea 25: Next 16 + next-intl (URLs /es/mascaras…), Tailwind 4 tokens, fuentes, rutas marketing/admin, Lighthouse 98/100

### infra

- [[2026-10-15-railway-mysql-y-db-local]] — Tarea 5: proyecto Railway sc-art-studio con MySQL 8.4 privado (sin proxy público) y MySQL local en Docker
- [[2026-10-14-repo-publico-monorepo-y-dominio]] — Repo público con protecciones, monorepo base (tarea 2), CI verde y dominio scartstudios.com

### negocio

- [[2026-10-18-guia-contadores-llc-y-stripe]] — Tarea 36.2: guía privada para contadores (LLC B2) y Stripe descartado como pasarela

### seguridad

- [[2026-10-20-login-admin-refresh-rotativo-csrf]] — Tarea 13: login del admin con argon2id, JWT 15 min, refresh rotativo con detección de reuso, CSRF por sesión, bloqueo 5/15 min y AuditLog
- [[2026-10-14-gitleaks-pre-commit-y-plan-incidentes]] — Tarea 37: husky + gitleaks en pre-commit, rotación de secretos, restauración de respaldos y plan de incidentes

---

## Conceptos

*(vacío — emergerán vía `/brain lint` cuando un término aparezca en 3+ nodos)*

## ADRs

*(vacío)*
