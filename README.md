# SC Art Studio

Tienda en línea y espacio de trabajo para máscaras artesanales personalizadas, típicas de Guatemala.
Producto y requisitos en `.taskmaster/docs/prd.md`; reglas para agentes en `CLAUDE.md` y `AGENTS.md`.

## Stack (plantilla stack-web-mea)
| Capa | Tecnología | Despliegue |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Vercel (Root Directory: `apps/web`) |
| Backend | Express + TypeScript + Prisma + Zod | Railway (Root Directory: `apps/api`) |
| Base de datos | MySQL | Railway |
| Comercio | Shopify Basic (Storefront + Admin API) | — |
| Archivos | Cloudflare R2 | — |
| DNS | Cloudflare (DNS only hacia Vercel y Railway) | — |

## Estructura
```
apps/web/            Next.js → Vercel
apps/api/            Express + Prisma → Railway
  src/middleware/    seguridad, auth, errores
  src/lib/           password (argon2id), webhooks (HMAC), env (Zod)
  prisma/            schema base: AdminUser, AuditLog, CostSettings
packages/shared/     tipos y schemas Zod compartidos (@sc-art-studio/shared)
docs/                seguridad.md (13 capas), prd-template.md
scripts/             backup-mysql.sh, pre-commit.sh (gitleaks)
.github/             CI y Dependabot
.taskmaster/         PRD y árbol de tareas (Task Master)
```

## Requisitos
- Node.js 22 o superior, npm 10 o superior.
- gitleaks (`brew install gitleaks`): el hook pre-commit (husky, se instala con `npm install`) bloquea commits con secretos.

## Comandos
```bash
npm install          # instala los 3 workspaces
npm run dev:web      # frontend en http://localhost:3000
npm run dev:api      # API (necesita apps/api/.env, ver .env.example)
npm run typecheck    # TypeScript en todos los workspaces
npm test             # pruebas
npm run audit        # npm audit --audit-level=high
```

Variables de entorno: copiar `.env.example` a `apps/api/.env` y `apps/web/.env.local`. Nunca subir valores reales.

## Cómo contribuir
1. Tomar la siguiente tarea con Task Master (`task-master next`).
2. Ciclo auditar → implementar → QA. Commits pequeños en español (`feat:`, `fix:`, `chore:`…).
3. `main` está protegida contra force-push y borrado.
