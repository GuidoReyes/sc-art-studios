---
type: session
area: docs
date: 2026-10-14
slug: reglas-claude-md-y-agents-md
title: "Reglas del proyecto en CLAUDE.md y AGENTS.md (tarea 3)"
tags: [task-master, claude-md, agents, seguridad, proteccion-menor, commits]
status: active
related:
  - 2026-10-14-repo-publico-monorepo-y-dominio
sources:
  - repo:CLAUDE.md
  - repo:AGENTS.md
  - repo:.taskmaster/docs/prd.md
superseded_by: null
---

# Reglas del proyecto en CLAUDE.md y AGENTS.md (tarea 3)

## Contexto
Tarea 3 de Task Master: dejar las reglas del PRD (§4.2, §4.7, §4.8, §4.9 y §6) donde cualquier agente las lea al arrancar.

## Decisiones
- `CLAUDE.md` resume las 13 capas de seguridad en una línea accionable cada una; el detalle sigue en `docs/seguridad.md` para no duplicarlo.
- La protección de la menor se aplica también al repo, a `brain/`, a los commits y a los issues (no solo al sitio). Se escribe "la menor" en lugar de su nombre.
- Convención de commits: agregar solo los archivos de la tarea, en vez del `git add -A` que sugería la tarea.
- `AGENTS.md` usa los nombres reales de los agentes del plugin (`ecc:planner`, `ecc:code-reviewer`, etc.) y suma `typescript-reviewer`, `database-reviewer` y `e2e-runner`.
- Regla crítica: lo que el PRD marca como SUPUESTO es un valor inicial (seed) en la DB, no una constante.

## Output
- Commit `9385435`: `CLAUDE.md` (103 líneas) y `AGENTS.md` (38 líneas).
- QA: 13 capas contadas; stack, privacidad de la menor, commits y `CostSettings` presentes.
- Tarea 3 y subtareas 3.1 a 3.5 en `done`.

## Pendiente
- Siguientes tareas desbloqueadas: #4 (DNS) y #5. También quedan disponibles #25 (frontend) y #37 (pre-commit de gitleaks).

## Cross-refs
- [[2026-10-14-repo-publico-monorepo-y-dominio]] — sesión anterior del mismo día; dejó el monorepo y el CLAUDE.md base que esta tarea amplía

## Fuentes
- [[sources#claude-md]]
- [[sources#prd]]
- [[sources#seguridad]]
