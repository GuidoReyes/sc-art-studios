---
type: session
area: seguridad
date: 2026-10-14
slug: gitleaks-pre-commit-y-plan-incidentes
title: "gitleaks en pre-commit y plan de incidentes (tarea 37)"
tags: [task-master, gitleaks, husky, secretos, respaldos, incidentes]
status: active
related:
  - 2026-10-14-scaffold-frontend-nextjs-i18n
  - 2026-10-14-repo-publico-monorepo-y-dominio
  - 2026-10-14-reglas-claude-md-y-agents-md
sources:
  - repo:docs/seguridad.md
  - repo:scripts/pre-commit.sh
  - repo:.gitleaks.toml
  - repo:scripts/backup-mysql.sh
superseded_by: null
---

# gitleaks en pre-commit y plan de incidentes (tarea 37)

## Contexto
Tarea 37 (capas 2 y 13): bloquear secretos antes de cada commit y escribir cómo responder a un incidente, rotar secretos y restaurar respaldos.

## Decisiones
- **husky** (no lefthook): `prepare: "husky || true"` para que `npm install` instale el hook y no falle donde no hay `.git` (builds de Vercel/Railway).
- gitleaks 8.30 se instala con Homebrew en la Mac, no por npm. El subcomando `protect` quedó obsoleto: se usa `gitleaks git --pre-commit --staged --redact`. Sin gitleaks instalado, el commit falla a propósito.
- Contactos en `docs/seguridad.md` solo por **rol**; teléfonos y correos viven en el gestor de contraseñas (repo público).
- El modo mantenimiento con `MAINTENANCE_MODE` queda pendiente para la tarea del frontend; mientras tanto se documentan rollback/pause en Vercel, quitar el dominio de la API en Railway y la contraseña de la tienda en Shopify.
- Al rotar la llave `age`, conservar la privada vieja para descifrar respaldos anteriores.
- Tarea 37 en `review`, no `done`: su criterio de aceptación pide que Guido revise `docs/seguridad.md`.

## Output
- Commit `98a4613` (CI en verde): `.husky/pre-commit`, `scripts/pre-commit.sh`, husky en `package.json`, `.gitignore` (+`*.pfx`, `credentials.json`, `secrets/`), `docs/seguridad.md` (+ barreras, plan, rotación, restauración, plantilla de aviso, registro), README.
- QA: un token GitHub falso generado al azar fue bloqueado (`github-pat`, HEAD sin cambios); un commit normal pasó ("no leaks found"); historial completo escaneado sin fugas; `git check-ignore` confirma los patrones y `.env.example` sigue commiteable.
- Subtareas 37.1 a 37.4 en `done`.

## Pendiente
- Guido revisa `docs/seguridad.md` → pasar la tarea 37 a `done`.
- Implementar `MAINTENANCE_MODE` en el middleware de Next.js (tarea del frontend).
- Completar las variables de R2 en `.env.example` cuando se configure R2.
- Primera prueba de restauración cuando exista la base en Railway.

## Cross-refs
- [[2026-10-14-scaffold-frontend-nextjs-i18n]] — tarea 25: proxy.ts donde irá MAINTENANCE_MODE y riesgo CSP documentado
- [[2026-10-14-repo-publico-monorepo-y-dominio]] — ahí se creó `.gitleaks.toml` y el repo se hizo público, lo que motiva esta barrera
- [[2026-10-14-reglas-claude-md-y-agents-md]] — CLAUDE.md resume las 13 capas cuyo detalle operativo vive en docs/seguridad.md

## Fuentes
- [[sources#seguridad]]
- [[sources#ci]]
