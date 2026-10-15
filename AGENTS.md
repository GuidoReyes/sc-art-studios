# Agentes en SC Art Studio

- **Senior / orquestador:** Claude Code. Decide arquitectura, revisa PRs de otros agentes, ejecuta Task Master.
- **Desarrolladores en paralelo (opcional):** Codex CLI y Grok CLI, cada uno en su propio worktree (`git worktree add ../<proyecto>-<tarea> -b <rama>`).
- Reglas para todos: las de `CLAUDE.md`. Ningún agente hace push a `main` directo si la rama está protegida; se abre PR y el senior la revisa.
