# brain — Bitácora de operaciones

> Append-only. Entradas más recientes al **final**.
> Formato: `## [YYYY-MM-DD HH:MM] <operación> | <slug-o-destino>`
> Operaciones válidas: `bootstrap`, `ingest`, `update`, `rename`, `merge`, `split`, `lint`, `deprecate`.

---

## [2026-10-14 21:42] bootstrap | wiki-initialized
- Creado: CLAUDE.md, index.md, log.md, sources.md, sessions/
- Áreas: backend | comercio | docs | frontend | infra | negocio | seguridad
- Backend: B — archivos locales del repo
- Generado por: skill claude-brain v1

## [2026-10-14 21:45] ingest | 2026-10-14-repo-publico-monorepo-y-dominio
- Primer nodo: sesión del 14-15 oct 2026 (tareas 1, 2, 36.1, fix CI)
- Cross-refs: ninguna (primer nodo)

## [2026-10-14 21:47] ingest | 2026-10-14-reglas-claude-md-y-agents-md
- Cross-refs: [[2026-10-14-repo-publico-monorepo-y-dominio]] (bidireccional)

## [2026-10-14 21:51] ingest | 2026-10-14-gitleaks-pre-commit-y-plan-incidentes
- Cross-refs: [[2026-10-14-repo-publico-monorepo-y-dominio]], [[2026-10-14-reglas-claude-md-y-agents-md]] (bidireccionales)

## [2026-10-14 22:01] ingest | 2026-10-14-scaffold-frontend-nextjs-i18n
- Cross-refs: [[2026-10-14-repo-publico-monorepo-y-dominio]], [[2026-10-14-gitleaks-pre-commit-y-plan-incidentes]] (bidireccionales)

## [2026-10-14 22:20] ingest | 2026-10-14-i18n-hreflang-sitemap-404
- Cross-refs: [[2026-10-14-scaffold-frontend-nextjs-i18n]] (bidireccional)

## [2026-10-15 10:40] ingest | 2026-10-15-railway-mysql-y-db-local
- Cross-refs: [[2026-10-14-repo-publico-monorepo-y-dominio]], [[2026-10-14-gitleaks-pre-commit-y-plan-incidentes]] (bidireccionales)

## [2026-10-17 22:40] ingest | 2026-10-17-scaffold-backend-express
- Cross-refs: [[2026-10-15-railway-mysql-y-db-local]], [[2026-10-14-repo-publico-monorepo-y-dominio]] (bidireccionales)

## [2026-10-18 11:45] ingest | 2026-10-18-prisma-7-schema-y-migracion-inicial
- Área: backend
- Cross-refs: [[2026-10-17-scaffold-backend-express]], [[2026-10-15-railway-mysql-y-db-local]], [[2026-10-18-guia-contadores-llc-y-stripe]] (bidireccionales)

## [2026-10-18 11:45] ingest | 2026-10-18-guia-contadores-llc-y-stripe
- Área: negocio
- Cross-refs: [[2026-10-18-prisma-7-schema-y-migracion-inicial]], [[2026-10-14-repo-publico-monorepo-y-dominio]] (bidireccionales)

## [2026-10-19 09:55] ingest | 2026-10-19-componentes-base-del-diseno
- Área: frontend
- Cross-refs: [[2026-10-14-scaffold-frontend-nextjs-i18n]], [[2026-10-14-i18n-hreflang-sitemap-404]], [[2026-10-18-prisma-7-schema-y-migracion-inicial]], [[2026-10-14-repo-publico-monorepo-y-dominio]] (bidireccionales)

## [2026-10-19 19:55] ingest | 2026-10-19-seed-tarifas-fedex-y-costos
- Área: backend
- Cross-refs: [[2026-10-18-prisma-7-schema-y-migracion-inicial]], [[2026-10-15-railway-mysql-y-db-local]], [[2026-10-18-guia-contadores-llc-y-stripe]], [[2026-10-19-componentes-base-del-diseno]] (bidireccionales)

## [2026-10-19 20:15] ingest | 2026-10-19-endpoints-publicos-de-mascaras
- Área: backend
- Cross-refs: [[2026-10-19-seed-tarifas-fedex-y-costos]], [[2026-10-17-scaffold-backend-express]], [[2026-10-19-componentes-base-del-diseno]] (bidireccionales)

## [2026-10-19 20:30] ingest | 2026-10-19-endpoints-publicos-historias-y-videos
- Área: backend
- Cross-refs: [[2026-10-19-endpoints-publicos-de-mascaras]], [[2026-10-17-scaffold-backend-express]] (bidireccionales)

## [2026-10-19 22:30] ingest | 2026-10-19-formulario-de-encargos-con-foto-segura
- Área: backend
- Cross-refs: [[2026-10-19-endpoints-publicos-historias-y-videos]], [[2026-10-17-scaffold-backend-express]] (bidireccionales)

## [2026-10-20 09:40] ingest | 2026-10-20-cotizador-de-envio-sin-perdida
- Área: backend
- Cross-refs: [[2026-10-19-seed-tarifas-fedex-y-costos]], [[2026-10-19-formulario-de-encargos-con-foto-segura]], [[2026-10-19-endpoints-publicos-de-mascaras]] (bidireccionales)

## [2026-10-20 09:50] ingest | 2026-10-20-login-admin-refresh-rotativo-csrf
- Área: seguridad (área nueva en el índice)
- Cross-refs: [[2026-10-20-cotizador-de-envio-sin-perdida]], [[2026-10-17-scaffold-backend-express]], [[2026-10-18-prisma-7-schema-y-migracion-inicial]] (bidireccionales)

## [2026-10-20 19:55] ingest | 2026-10-20-crud-admin-auditado
- Área: backend
- Cross-refs: [[2026-10-20-login-admin-refresh-rotativo-csrf]], [[2026-10-19-endpoints-publicos-de-mascaras]], [[2026-10-19-endpoints-publicos-historias-y-videos]], [[2026-10-18-prisma-7-schema-y-migracion-inicial]] (bidireccionales)

## [2026-10-21 00:50] ingest | 2026-10-21-motor-de-precios-sugeridos
- Área: backend
- Cross-refs: [[2026-10-20-crud-admin-auditado]], [[2026-10-20-cotizador-de-envio-sin-perdida]], [[2026-10-19-seed-tarifas-fedex-y-costos]] (bidireccionales)
