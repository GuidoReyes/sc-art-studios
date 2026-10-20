---
type: session
area: infra
date: 2026-10-15
slug: railway-mysql-y-db-local
title: "Railway: proyecto sc-art-studio con MySQL privado y MySQL local en Docker"
tags: [railway, mysql, docker, prisma, base-de-datos, task-master]
status: active
related:
  - 2026-10-17-scaffold-backend-express
  - 2026-10-14-repo-publico-monorepo-y-dominio
  - 2026-10-14-gitleaks-pre-commit-y-plan-incidentes
sources:
  - repo:docker-compose.yml
  - repo:docker/mysql/init/01-dev-privileges.sh
  - repo:apps/api/.env.example
  - repo:docs/seguridad.md
  - repo:README.md
  - repo:CLAUDE.md
superseded_by: null
---

# Railway: proyecto sc-art-studio con MySQL privado y MySQL local en Docker

## Contexto
Tarea 5 [HUMANO] de Task Master. La CLI de Railway (5.68) ya estaba instalada y con sesión de Guido (5.1). Guido autorizó crear el proyecto. Para la conexión de desarrollo pidió hacerlo "como está configurado el proyecto de MEA": MEA usa MySQL local (`localhost:3306`) en desarrollo y la base de Railway solo en producción.

## Decisiones
- Proyecto Railway `sc-art-studio` en el workspace de Guido, entorno `production`, región sfo. Servicio `MySQL` (imagen `mysql:8`, corre 8.4.11) con volumen persistente.
- **Sin proxy TCP público**: la base solo se alcanza por `mysql.railway.internal`. La API usará `DATABASE_URL=${{MySQL.MYSQL_URL}}` y aplica migraciones al arrancar (`prisma migrate deploy`, ya en `start`).
- Desarrollo con MySQL 8.4 en Docker (`docker-compose.yml`) en `127.0.0.1:3306`, en lugar de MySQL de Homebrew. Es reproducible y la versión coincide con la de Railway. Las credenciales salen de `apps/api/.env` (gitignored) vía `--env-file`.
- Se descartó lo que proponía la tarea, copiar el `DATABASE_URL` de Railway a `.env` local: exige exponer la base a internet y poner credenciales de producción en la Mac.
- El usuario local `sc_app` tiene privilegios globales de CREATE/DROP solo en desarrollo, para la base shadow de `prisma migrate dev`.

## Output
- `docker-compose.yml`, `docker/mysql/init/01-dev-privileges.sh`; scripts `db:up`, `db:down` y `db:logs` en el `package.json` raíz.
- `apps/api/.env.example` documenta `LOCAL_MYSQL_PASSWORD`, `LOCAL_MYSQL_ROOT_PASSWORD` y el formato de `DATABASE_URL` local y de producción.
- README (sección Base de datos), CLAUDE.md (Cuentas e infraestructura) y docs/seguridad.md (capa 7: estado y pendientes).
- Verificado: el contenedor está healthy, `prisma db execute` con `SELECT 1` funciona y los logs de Railway muestran "ready for connections" en 8.4.11.

## Pendiente
- Crear en Railway un usuario de la app con privilegios mínimos y dejar de usar `root`. Se hace al desplegar la API (tareas 6–7).
- Primera migración de Prisma: tarea 7.
- Respaldos diarios cifrados de la base de Railway, según el plan de docs/seguridad.md.

## Cross-refs
- [[2026-10-17-scaffold-backend-express]] — tarea 6: scaffold del backend Express.
- [[2026-10-14-repo-publico-monorepo-y-dominio]] — monorepo y CI sobre los que se monta la base.
- [[2026-10-14-gitleaks-pre-commit-y-plan-incidentes]] — rotación de secretos y restauración de respaldos que aplican a esta base.
- [[2026-10-18-prisma-7-schema-y-migracion-inicial]] — primera migración aplicada sobre esta base local; Railway la recibe con `migrate deploy`.
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — el seed se verificó en este MySQL local y se correrá en el de Railway.

## Fuentes
- repo:docker-compose.yml
- repo:docs/seguridad.md
- repo:CLAUDE.md
