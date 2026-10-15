# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Repositorio y protecciones de GitHub
- Repo: https://github.com/GuidoReyes/sc-art-studios (**público** desde 14-oct-2026). Usar el nombre `sc-art-studios` en todos los comandos `gh` (el PRD dice `sc-art-studio`).
- Activo: ruleset `main-protection` (sin force-push ni borrado de `main`), Dependabot alerts y security updates, secret scanning y push protection.
- Al ser público, todo lo que se suba es visible: nunca secretos, datos personales ni datos de clientes. gitleaks en pre-commit (tarea 37) como segunda barrera.

## Cuentas e infraestructura
- Vercel (equipo `guidoreyes-projects`), Railway y Cloudflare: se usan las cuentas existentes de Guido; se crean proyectos nuevos dentro de ellas.
- Dominio: **`scartstudios.com`** (comprado en Cloudflare Registrar el 15-oct-2026, vence 15-oct-2027, renovación automática activada; nameservers `sage`/`zoe.ns.cloudflare.com`). El PRD dice `sc-artstudio.com`: siempre usar `scartstudios.com` (`api.`, `shop.`, etc.).

## Monorepo
- npm workspaces: `@sc-art-studio/web`, `@sc-art-studio/api`, `@sc-art-studio/shared`. Para depender de shared usar `"@sc-art-studio/shared": "*"` (npm no soporta `workspace:*`).

## Memoria del proyecto (brain)
- Wiki en `brain/` (reglas en `brain/CLAUDE.md`). Al cerrar cada sesión de trabajo ejecutar `/brain ingest` para registrar lo hecho; `/brain query <pregunta>` para consultar el historial y `/brain lint` para revisar el wiki.
- El repo es público: en `brain/` nunca van secretos ni datos personales (ver la sección Privacidad de `brain/CLAUDE.md`).
