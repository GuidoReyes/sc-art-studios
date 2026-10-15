# brain — Registro de fuentes externas

> Registro de archivos del repo que sirven como fuente de verdad.
> Referenciar desde frontmatter con prefijo `repo:<path>`.
> Para el contenido actual siempre leer el archivo directamente — este registro
> es sólo un directorio de qué existe y dónde.

---

## Archivos del repo

### prd
- **Path:** `.taskmaster/docs/prd.md`
- **Descripción:** PRD original. Ojo: dice `sc-artstudio.com` y `sc-art-studio`; prevalecen `scartstudios.com` y el repo `sc-art-studios`.

### tasks
- **Path:** `.taskmaster/tasks/tasks.json`
- **Descripción:** Árbol de tareas de Task Master (estado real de cada tarea y subtarea).

### claude-md
- **Path:** `CLAUDE.md`
- **Descripción:** Reglas para agentes: repo, cuentas, dominio, monorepo.

### seguridad
- **Path:** `docs/seguridad.md`
- **Descripción:** Las 13 capas de seguridad del proyecto.

### ci
- **Path:** `.github/workflows/ci.yml`
- **Descripción:** CI: typecheck, tests, audit y gitleaks (`.gitleaks.toml`).

---

## URLs externas

### repo-github
- **URL:** https://github.com/GuidoReyes/sc-art-studios
- **Descripción:** Repo público; ruleset `main-protection`.

### dominio
- **URL:** https://scartstudios.com
- **Descripción:** Dominio en Cloudflare Registrar (DNS en Cloudflare).
