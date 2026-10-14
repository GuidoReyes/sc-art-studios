# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Repositorio y protecciones de GitHub
- Repo: https://github.com/GuidoReyes/sc-art-studios (privado). Usar el nombre `sc-art-studios` en todos los comandos `gh` (el PRD dice `sc-art-studio`).
- Cuenta de GitHub en plan **Free** (14-oct-2026). Por eso:
  - Activo: Dependabot alerts y Dependabot security updates.
  - **No disponible**: protección de rama / rulesets en `main` (HTTP 403, requiere GitHub Pro) y secret scanning + push protection (HTTP 422, requiere GitHub Secret Protection).
- Compensación mientras tanto:
  - Nunca `git push --force` ni borrar `main`. No reescribir historia ya subida.
  - gitleaks como hook de pre-commit (tarea 37) cumple el papel de push protection.
  - Si se pasa a GitHub Pro: activar protección de `main` (sin force-push ni borrado) y volver a intentar secret scanning.
