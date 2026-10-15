# Agentes en SC Art Studio

Reglas para todos los agentes: las de `CLAUDE.md` (seguridad, protección de la menor, commits) y la memoria en `brain/`.

## Roles
- **Senior / orquestador:** Claude Code. Decide arquitectura, revisa PRs de otros agentes y ejecuta Task Master.
- **Desarrolladores en paralelo (opcional):** Codex CLI y Grok CLI, cada uno en su propio worktree (`git worktree add ../sc-art-studio-<tarea> -b <rama>`).
- Ningún agente hace push directo a `main` cuando trabaja en paralelo: abre PR y el senior la revisa.

## Agentes disponibles (plugin `ecc`)
| Agente | Propósito | Cuándo usarlo |
|---|---|---|
| `ecc:planner` | Plan de implementación | Funcionalidades complejas o refactorizaciones grandes |
| `ecc:architect` | Diseño de sistema | Decisiones de arquitectura, módulos nuevos |
| `ecc:tdd-guide` | Desarrollo guiado por pruebas (cobertura ≥ 80 %) | Funcionalidades nuevas y corrección de bugs |
| `ecc:code-reviewer` | Revisión de calidad | **Siempre** después de escribir o modificar código |
| `ecc:security-reviewer` | Análisis de seguridad (OWASP) | Auth, pagos, webhooks, subidas, datos de usuario; **antes** de commitear ese código |
| `ecc:typescript-reviewer` | Revisión TS/JS | Cambios en `apps/` y `packages/` |
| `ecc:database-reviewer` | Esquema y consultas | Cambios en `prisma/schema.prisma` o migraciones |
| `ecc:build-error-resolver` | Errores de build/typecheck | Cuando falla `npm run typecheck` o `next build` |
| `ecc:e2e-runner` | Pruebas E2E | Flujos críticos: compra, encargo, login admin |

## Uso inmediato, sin que lo pidan
- Feature compleja → `ecc:planner`
- Código recién escrito → `ecc:code-reviewer`
- Bug o feature nueva → `ecc:tdd-guide`
- Decisión de arquitectura → `ecc:architect`
- Código sensible (auth, pagos, datos personales) → `ecc:security-reviewer`

## Regla crítica de configurabilidad
> ⚠️ Todo precio, tarifa, costo, comisión o valor monetario es **configurable en la base de datos** (`CostSettings`, tarifas de envío, etc.), **nunca hardcoded**. Incluye precios de productos, tarifas de envío, comisiones de pasarela, tipo de cambio y márgenes.

## Referencias al PRD (`.taskmaster/docs/prd.md`)
- Stack técnico: §4.2
- Pagos: §4.7
- Seguridad: §4.8
- Protección de la menor: §4.9
- Modelo de costos: §6
