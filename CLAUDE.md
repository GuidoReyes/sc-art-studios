# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Antes de empezar
1. Leer este archivo, `AGENTS.md` y `brain/index.md` (memoria de sesiones anteriores).
2. Tomar la tarea con `task-master next` y trabajar por fases y en orden (PRD §5). Ciclo por tarea: **auditar → implementar → QA**.
3. Todo lo marcado **[HUMANO]** (compras, cuentas, pagos, 2FA, verificaciones de identidad) lo hace una persona: Claude prepara el paso exacto, se detiene y espera confirmación.
4. Antes de escribir UI cargar el skill `frontend-design`. Vercel: plugin/CLI oficial; Railway: CLI `railway`; Shopify: docs oficiales de Storefront API y Admin GraphQL API.

## Regla crítica: datos configurables
> **Todo precio, tarifa, costo, comisión, tipo de cambio o margen vive en la base de datos (`CostSettings`, tarifas de envío, etc.), nunca hardcoded en el código.** Lo que el PRD marca como SUPUESTO es un valor inicial para la DB (seed), no una constante. Ver PRD §6.

## Stack técnico (PRD §4.2 — idéntico a MEA salvo donde se indique)
| Capa | Tecnología | Despliegue / nota |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind o CSS Modules con tokens; next-intl (en/es) | Vercel, Root Directory `apps/web` |
| Backend | Node.js + Express + TypeScript + Prisma + Zod | Railway, Root Directory `apps/api` |
| Base de datos | MySQL (Prisma como ORM) | Railway, red privada |
| Comercio | Shopify Basic (Storefront API + Admin GraphQL API) | Fuente de verdad de producto, precio, inventario y pedidos |
| Pagos | PayPal como proveedor en Shopify (MVP) | PRD §4.7; cuentas a nombre de un adulto responsable |
| Archivos | Cloudflare R2 | Fotos en alta resolución y clips cortos; videos largos en YouTube |
| DNS | Cloudflare | Registros hacia Vercel y Railway en "DNS only" (proxy apagado) |
| Correo | Notificaciones de Shopify + Resend para encargos | |
| Anti-spam | Cloudflare Turnstile en formularios públicos | |
| Monitoreo | Logs de Vercel y Railway; alertas por correo | |
| Tareas | Task Master (`task-master-ai`) | `.taskmaster/` |

## Capas de seguridad obligatorias (PRD §4.8, detalle en `docs/seguridad.md`)
1. **Identidad y acceso:** contraseñas solo con argon2id (`apps/api/src/lib/password.ts`), nunca en texto plano ni visibles al admin. JWT de 15 min + refresh rotativo en cookie `httpOnly`/`Secure`/`SameSite=Lax`; CSRF en formularios del admin. Bloqueo tras 5 intentos fallidos durante 15 min. Roles `OWNER` y `EDITOR` (sin borrar pedidos). 2FA en todas las cuentas externas.
2. **Secretos:** solo en `.env` (gitignored), Vercel Env Vars y Railway Variables; `.env.example` sin valores. gitleaks en pre-commit y en CI. Token Admin de Shopify solo en el backend. Rotar cada 6 meses o al filtrarse. Variables requeridas validadas al arrancar (`apps/api/src/lib/env.ts`).
3. **Validación:** Zod en cada ruta (body, query, params) y formulario, rechazando campos desconocidos. Solo Prisma parametrizado (nada de SQL con texto). Sanitizar texto enriquecido (DOMPurify / `sanitize-html`). Subidas solo jpeg/png/webp/mp4 con tamaño máximo; re-codificar con `sharp` y borrar EXIF/GPS.
4. **Transporte y cabeceras:** HTTPS y HSTS; Helmet en Express; CSP estricta en Next (solo Shopify, YouTube, TikTok, Instagram, R2, Turnstile); `X-Frame-Options: DENY` en admin; `Referrer-Policy` y `Permissions-Policy` restrictivas; CORS solo a dominios propios.
5. **Perímetro:** rate limiting general y estricto en login, formularios y cotizador de envío; Turnstile en formularios públicos; firewall de Vercel para `/admin` y `/api`; `/admin` con `noindex` y sin enlaces públicos.
6. **Integraciones:** webhooks de Shopify con HMAC (`apps/api/src/lib/webhooks.ts`) y rechazo de repetidos (guardar ID procesado); APIs externas con timeout y reintentos limitados; nunca loguear tokens.
7. **Base de datos y respaldos:** usuario de DB con privilegios mínimos; respaldo diario cifrado (`age`/gpg) a Google Drive y semanal a R2 (retención 7 diarios / 4 semanales / 6 mensuales); prueba de restauración mensual anotada en `docs/seguridad.md`.
8. **Auditoría y alertas:** `AuditLog` de toda acción del admin (quién, qué, cuándo, antes/después); logs pino sin datos personales ni tokens; alertas por correo (5xx repetidos, logins fallidos, webhook o respaldo fallido).
9. **Cadena de suministro:** Dependabot, `npm audit --audit-level=high` en CI, `package-lock.json` versionado, `main` protegida; si el CI falla no se despliega.
10. **Agente de ciberseguridad:** tarea semanal que revisa `npm audit`, cabeceras (`curl -I`), certificados, último respaldo y cuentas admin activas, y envía reporte.
11. **Equipo:** Mac con FileVault y bloqueo automático. **Claude nunca ejecuta comandos destructivos en producción** (migraciones que borran datos, `DROP`, borrar buckets, `git push --force`, borrar `main`) sin confirmación humana.
12. **Privacidad y protección de la menor:** ver sección siguiente.
13. **Respuesta a incidentes:** plan en `docs/seguridad.md` (avisar, rotar secretos, modo mantenimiento, restaurar respaldo, avisar a clientes).

## Protección de la menor (PRD §4.9 — OBLIGATORIO, no opcional)
**Nunca se publica** (sitio, repo, `brain/`, commits, issues, redes): grado o nombre de la escuela, apellido completo, ciudad, barrio o dirección, rutinas diarias. La ubicación pública es solo "Guatemala". (El HTML de referencia dice "cuarto grado": quitarlo.)

**Comunicación:** sin mensajes directos ni chat hacia la menor; todo contacto va al WhatsApp y correo del adulto. Copy obligatorio en contacto y checkout: "Un adulto de la familia responde los mensajes". En el sitio no hay comentarios públicos.

**Redes:** cuentas de marca administradas por un adulto (las plataformas exigen 13+); la menor aparece en el contenido pero no es titular ni administradora; comentarios moderados. [HUMANO] Clasificar cada video de YouTube con el criterio de la [FTC](https://www.ftc.gov/business-guidance/blog/2019/11/youtube-channel-owners-your-content-directed-children) (el contenido apunta a compradores adultos).

**Checklist antes de publicar cualquier contenido:**
- [ ] ¿Revela ubicación más específica que "Guatemala"?
- [ ] ¿Menciona escuela, grado o apellido?
- [ ] ¿Describe rutinas u horarios?
- [ ] ¿La foto o video conserva metadatos GPS/EXIF?
Si alguna respuesta es "sí", no se publica.

## Convención de commits
Formato `<tipo>: <descripción en español>`. Tipos: `feat` (funcionalidad), `fix` (corrección), `refactor` (sin cambio de comportamiento), `docs`, `test`, `chore` (mantenimiento), `perf`, `ci`.
- Español, en infinitivo (`agregar`, `corregir`, `actualizar`), primera línea ≤ 72 caracteres y sin punto final; cuerpo opcional con el porqué.
- Commits pequeños: uno por tarea o subtarea cerrada, y luego actualizar el estado en Task Master.
- Agregar solo los archivos de la tarea (no `git add -A` a ciegas); revisar `git status` antes de commitear.
- Nunca `git push --force` ni reescribir historial ya subido.

```
feat: agregar formulario de encargo personalizado
fix: corregir cálculo de peso volumétrico
refactor: extraer lógica de precios a servicio separado
docs: actualizar reglas de seguridad en CLAUDE.md
chore: actualizar dependencias de producción
```

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

## Referencias rápidas al PRD (`.taskmaster/docs/prd.md`)
| Tema | Sección |
|---|---|
| Funcionalidades F1–F10 | §2 |
| Diseño y páginas | §3 |
| Stack | §4.2 |
| Modelo de datos | §4.4 |
| API del backend | §4.5 |
| Pagos | §4.7 |
| Seguridad | §4.8 |
| Protección de la menor | §4.9 |
| Roadmap por fases | §5 |
| Modelo de costos y precios | §6 |
