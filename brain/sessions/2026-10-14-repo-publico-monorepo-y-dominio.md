---
type: session
area: infra
date: 2026-10-14
slug: repo-publico-monorepo-y-dominio
title: "Repo público, monorepo base, CI verde y dominio"
tags: [github, monorepo, ci, gitleaks, dominio, cloudflare, task-master]
status: active
related:
  - 2026-10-14-scaffold-frontend-nextjs-i18n
  - 2026-10-14-gitleaks-pre-commit-y-plan-incidentes
  - 2026-10-14-reglas-claude-md-y-agents-md
sources:
  - repo:.taskmaster/tasks/tasks.json
  - repo:CLAUDE.md
  - repo:.github/workflows/ci.yml
  - repo:.gitleaks.toml
superseded_by: null
---

# Repo público, monorepo base, CI verde y dominio

## Contexto
Arranque del proyecto con Task Master (`task-master next`). Se ejecutaron la tarea 1 (git y protecciones de GitHub), la tarea 2 (base del monorepo), la subtarea 36.1 (dominio) y un arreglo de CI.

## Decisiones
- **Repo público** (`GuidoReyes/sc-art-studios`): antes se escaneó todo el historial (solo había secretos de ejemplo). Se activaron secret scanning, push protection, Dependabot alerts y security updates, y el ruleset `main-protection` (sin force-push ni borrado de `main`). Se comprobó que GitHub rechaza un push non-fast-forward.
- **Cuentas:** se usan las cuentas existentes de Vercel (equipo `guidoreyes-projects`), Railway y Cloudflare, con proyectos nuevos dentro. Shopify y PayPal siguen pendientes ([HUMANO], 36.3).
- **Monorepo:** se partió de la plantilla `stack-web-mea` con npm workspaces `@sc-art-studio/{web,api,shared}`; para depender de shared se usa `"*"` porque npm no soporta `workspace:*`. Se subió a `next` ^16 y `vitest` ^5 → `npm audit` en 0. Se mantienen Prisma 5 y zod 3 por ahora.
- **gitleaks:** el valor `sk_live_...` falso del texto de la tarea 37 daba falso positivo; se añadió a la allowlist en `.gitleaks.toml`. El CI usa `fetch-depth: 0`.
- **Dominio:** `scartstudios.com` (Cloudflare Registrar, vence 15-oct-2027, renovación automática activa). Reemplaza a `sc-artstudio.com` del PRD en todo el repo, salvo en el propio PRD.
- **Memoria:** se instaló `brain/` (skill claude-brain) para registrar cada sesión.

## Output
- Commits en `main`: `d1f7fda` (monorepo base), `e7c22c8` (fix CI gitleaks), `7bffa45` y `7449211` (dominio), más este nodo.
- Tareas cerradas en Task Master: 1, 2 y 36.1.
- Verificado: typecheck, tests, `prisma validate`, `next build` y el CI de `main`, todos en verde.

## Pendiente
- 8 PRs de Dependabot (#1–#8) sin mergear, varios con cambios incompatibles (prisma 7, zod 4, express 5…). Se revisan en las tareas 6 y 7.
- Siguientes tareas: #3 (completar CLAUDE.md y AGENTS.md, recomendada), #25 (frontend), #37 (pre-commit de gitleaks; gitleaks aún no está instalado en local).
- Tarea #4: registros DNS hacia Vercel y Railway (en "DNS only") cuando existan los despliegues. `wrangler` aún no está instalado.
- Tarea #36 [HUMANO]: 36.2 (contadores, LLC), 36.3 (Shopify y PayPal con 2FA), 36.4 (redes sociales), 36.5 (costos reales).

## Cross-refs
- [[2026-10-14-scaffold-frontend-nextjs-i18n]] — tarea 25: frontend construido sobre este monorepo
- [[2026-10-14-gitleaks-pre-commit-y-plan-incidentes]] — tarea 37: gitleaks local como segunda barrera del repo público
- [[2026-10-14-reglas-claude-md-y-agents-md]] — tarea 3, que amplía el CLAUDE.md creado en esta sesión

## Fuentes
- [[sources#tasks]]
- [[sources#claude-md]]
- [[sources#ci]]
- [[sources#repo-github]]
- [[sources#dominio]]
