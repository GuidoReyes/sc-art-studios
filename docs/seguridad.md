# Seguridad — 13 capas (stack web MEA)
Estas son las capas que se aplicaron o se planearon en MEA (fase 0 de remediación OWASP, corrección de contraseñas, agente de ciberseguridad con respaldos automáticos) más el resto del OWASP Top 10. Nota: no pude leer el repo de MEA en esta sesión; si en MEA existe una capa que no esté aquí, Claude Code debe copiarla también y anotarla en `CLAUDE.md`.

**Capa 1 — Identidad y acceso**
- Contraseñas solo con argon2id (o bcrypt con costo ≥ 12). Nunca en texto plano, nunca visibles para el admin (error que se corrigió en MEA).
- JWT de vida corta (15 min) + refresh token rotativo en cookie `httpOnly`, `Secure`, `SameSite=Lax`; token CSRF en formularios del admin.
- Bloqueo tras 5 intentos fallidos durante 15 minutos; aviso por correo de inicio de sesión nuevo.
- Roles: `OWNER` (dueños), `EDITOR` (subir máscaras e historias), sin permisos de borrar pedidos.
- 2FA obligatorio en todas las cuentas externas: GitHub, Vercel, Railway, Cloudflare, la plataforma de comercio, PayPal, banco, Google, YouTube, TikTok, Instagram.

**Capa 2 — Secretos**
- Secretos solo en `.env` local (en `.gitignore`), Vercel Environment Variables y Railway Variables. `.env.example` sin valores.
- GitHub secret scanning y push protection activados (ver README, paso 5). Escaneo local antes de cada push con `gitleaks` (hook de pre-commit).
- Token de la plataforma de comercio Admin solo en el backend; en el frontend solo el token público de Storefront.
- Rotar secretos cada 6 meses o de inmediato si se filtran; procedimiento escrito en `docs/seguridad.md`.

**Capa 3 — Validación de entradas y salidas**
- Zod en cada ruta del backend (body, query, params) y en formularios del frontend. Rechazar campos desconocidos.
- Prisma con consultas parametrizadas (nada de SQL armado con texto). Escapar todo contenido de usuario al mostrarlo; el texto enriquecido de historias se sanitiza (DOMPurify o `sanitize-html`).
- Subidas: solo `image/jpeg`, `image/png`, `image/webp`, `video/mp4`; tamaño máximo; re-codificar imágenes con `sharp` y borrar EXIF/GPS.

**Capa 4 — Transporte y cabeceras**
- HTTPS en todo (Vercel y Railway emiten certificados). HSTS.
- Helmet en Express; en Next.js, cabeceras `Content-Security-Policy` (permitir solo la plataforma de comercio, YouTube, TikTok, Instagram, R2 y Turnstile), `X-Frame-Options: DENY` en admin, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva.
- CORS del API limitado a los dominios propios.
- **Riesgo aceptado (oct-2026):** la CSP de producción mantiene `'unsafe-inline'` en `script-src` porque las páginas son estáticas y no pueden llevar nonces por petición. Revisar antes de integrar Shopify y Turnstile: pasar a CSP con nonces desde `proxy.ts` (vuelve dinámicas las páginas) o mantener el riesgo documentado. `'unsafe-eval'` solo se permite en desarrollo.

**Capa 5 — Perímetro y abuso**
- Rate limiting en el API (general y más estricto en login, formularios y cotizador de envío).
- Cloudflare Turnstile en formularios públicos (encargos, contacto).
- Como en MEA, los registros que apuntan a Vercel van con proxy de Cloudflare apagado (DNS only); la protección de esos dominios la da el firewall de Vercel. Activar en Vercel las reglas de firewall para `/admin` y `/api` (el plan Hobby permite 3 reglas; Pro, más).
- `/admin` con `noindex`, sin enlaces públicos, y opcionalmente restringido por país o IP en el firewall de Vercel.

**Capa 6 — Integraciones**
- Webhooks de la plataforma de comercio verificados con HMAC y rechazo de repetidos (guardar el ID del webhook procesado). Igual que la verificación de webhooks de Meta en MEA.
- Llamadas a APIs externas con timeout y reintentos limitados; nunca registrar tokens en los logs.

**Capa 7 — Base de datos y respaldos**
- Usuario de base de datos con privilegios mínimos para la app; la base de Railway sin acceso público salvo el que use la app (red privada de Railway).
- Respaldo automático diario de MySQL a Google Drive con Service Account (mismo sistema que MEA) y copia semanal a R2. Retención: 7 diarios, 4 semanales, 6 mensuales. Cifrar los respaldos (gpg o `age`) antes de subirlos.
- Prueba de restauración una vez al mes en una base local; resultado anotado en `docs/seguridad.md`.

**Capa 8 — Registro, auditoría y alertas**
- `AuditLog` de toda acción del admin (quién, qué, cuándo, antes y después).
- Logs estructurados (pino) sin datos personales ni tokens.
- Alertas por correo: errores 5xx repetidos, muchos logins fallidos, webhook fallando, respaldo fallido.

**Capa 9 — Cadena de suministro del código**
- Dependabot y `npm audit` en CI; versiones exactas en `package-lock.json`.
- GitHub Actions: lint, typecheck, tests y `npm audit` en cada push; si falla, no se despliega. Dependencias de producción bloquean desde `high` (`--omit=dev`); el árbol completo, desde `critical`. Motivo: `braces` (vía `eslint-config-next`, solo desarrollo) tiene un advisory `high` sin versión corregida (oct-2026). Revisar cuando salga el arreglo.
- Rama `main` protegida (ver README, paso 5).

**Capa 10 — Agente de ciberseguridad (como en MEA)**
- Tarea programada semanal que: revisa `npm audit`, cabeceras de seguridad del sitio (por ejemplo con `curl -I`), certificados próximos a vencer, último respaldo exitoso, cuentas admin activas, y envía un reporte por correo o Telegram.

**Capa 11 — Equipo de desarrollo**
- Mac con FileVault, bloqueo automático y el mismo stack de seguridad del homelab (LittleSnitch, Wazuh, Malwarebytes).
- Claude Code no ejecuta comandos destructivos en producción sin confirmación humana.

**Capa 12 — Privacidad**
- Pedir solo los datos necesarios; política de privacidad publicada.
- Si aparecen menores de edad: sin apellido completo, escuela, grado, ciudad ni rutinas; cuentas en redes administradas por adultos; sin mensajes directos hacia el menor.

**Capa 13 — Respuesta a incidentes**
- `docs/seguridad.md` con: a quién avisar, cómo rotar todos los secretos, cómo poner el sitio en modo mantenimiento, cómo restaurar el último respaldo, y cómo avisar a clientes si hubo fuga de datos.

## Checklist antes de publicar
- [ ] 2FA en todas las cuentas externas
- [ ] `.env` fuera de Git; secret scanning y push protection activos; hook de gitleaks instalado
- [ ] argon2id en contraseñas; bloqueo por intentos fallidos probado
- [ ] Zod en todas las rutas; subidas re-codificadas sin EXIF
- [ ] Cabeceras de seguridad verificadas con `curl -I https://scartstudios.com`
- [ ] Rate limits y Turnstile activos
- [ ] Webhooks con HMAC y control de repetidos
- [ ] Respaldo automático funcionando y una restauración de prueba hecha
- [ ] Alertas por correo probadas
- [ ] CI con audit y gitleaks en verde; `main` protegida
- [ ] Plan de incidentes escrito abajo

## Barrera de secretos en el repo (capa 2)
El repo es **público**. Hay tres barreras, en este orden:
1. **Local — hook pre-commit:** husky ejecuta `scripts/pre-commit.sh`, que corre `gitleaks git --pre-commit --staged`. Se instala solo con `npm install` (script `prepare`). Requiere `brew install gitleaks`; sin gitleaks, el commit falla a propósito.
2. **GitHub — push protection y secret scanning:** rechazan el push si detectan un secreto conocido.
3. **CI — gitleaks-action** sobre todo el historial en cada push y PR.

Falsos positivos: agregar el valor exacto en `[allowlist]` de `.gitleaks.toml` con un comentario del porqué. Nunca saltarse el hook con `git commit --no-verify`.

## Plan de incidentes
> No publicar aquí teléfonos, correos personales ni direcciones (repo público). Los datos de contacto viven en el gestor de contraseñas compartido de la familia.

| Paso | Quién | Cómo |
|---|---|---|
| Detectar y avisar | Quien lo detecte → responsable técnico (Guido) | Alertas por correo, aviso de GitHub secret scanning o reporte del agente semanal. Avisar por WhatsApp al adulto responsable del negocio. |
| Contener | Responsable técnico | Modo mantenimiento (abajo) si hay datos de clientes en riesgo o el sitio está comprometido. |
| Rotar secretos | Responsable técnico | Sección "Rotación de secretos". Si no se sabe cuál se filtró, rotar **todos**. |
| Restaurar respaldo | Responsable técnico | Sección "Restauración de respaldos". |
| Avisar a clientes | Adulto responsable del negocio | Plantilla de aviso (abajo), dentro de las 72 h de confirmada una fuga de datos personales. |
| Cerrar | Responsable técnico | Anotar el incidente en `brain/` (sin datos personales) y qué se cambió para que no se repita. |

### Contactos de emergencia (roles)
| Rol | Para qué | Dónde está el contacto |
|---|---|---|
| Responsable técnico (Guido) | Código, infraestructura, secretos | Gestor de contraseñas |
| Adulto responsable del negocio | Shopify, PayPal, banco, aviso a clientes | Gestor de contraseñas |
| Soporte Shopify / PayPal / Cloudflare / Vercel / Railway | Cuentas comprometidas, cargos sospechosos | Panel de cada proveedor → Help/Support |

### Modo mantenimiento
Pendiente de implementar en el frontend (tarea del frontend): variable `MAINTENANCE_MODE=true` en Vercel que hace que el middleware de Next.js responda una página estática con estado 503. Mientras no exista:
1. **Frontend:** en Vercel → proyecto → Deployments, hacer *Instant Rollback* a un despliegue sano, o *Pause Project* (Settings → General) si el sitio entero está comprometido.
2. **API:** en Railway → servicio API → Settings, quitar el dominio público `api.scartstudios.com` o bajar las réplicas a 0. Así se corta el acceso sin borrar la base.
3. **Shopify:** si el problema es el checkout, activar la contraseña de la tienda (Online Store → Preferences → Password protection).
4. Salir del modo mantenimiento solo después de rotar secretos y verificar (checklist post-rotación).

## Rotación de secretos
Cada 6 meses o **de inmediato** si se filtra. Generar valores aleatorios con `openssl rand -base64 48`. Actualizar primero el valor nuevo en el proveedor, después en Railway/Vercel, redesplegar, verificar y recién entonces revocar el viejo.

| Secreto (variable) | Dónde se genera | Dónde se actualiza | Efecto |
|---|---|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | `openssl rand -base64 48` | Railway (API) | Cierra todas las sesiones del admin |
| `SHOPIFY_ADMIN_TOKEN` | Shopify Admin → Settings → Apps → app propia → API credentials. Si el token no se puede regenerar, desinstalar y reinstalar la app (o crear una nueva) — confirmar en la doc vigente de Shopify | Railway (API) | La API pierde acceso a Shopify hasta actualizarlo |
| `SHOPIFY_WEBHOOK_SECRET` | Credenciales de la misma app (client secret) | Railway (API) | Los webhooks firmados con el secreto viejo se rechazan |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` | Shopify → app/canal Headless → Storefront API → nuevo token y borrar el viejo | Vercel (web) | Es público por diseño; rotar solo si hay abuso |
| `TURNSTILE_SECRET` (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` no cambia) | Cloudflare → Turnstile → widget → *Rotate secret key* | Railway (API) | Formularios fallan si no se actualiza |
| Claves de R2 (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, al crearse) | Cloudflare → R2 → Manage API tokens → crear token nuevo con permisos mínimos y borrar el viejo | Railway (API) y remoto de rclone | Subidas y respaldos a R2 fallan si no se actualiza |
| `DATABASE_URL` | Conectado a MySQL: `ALTER USER '<usuario-app>'@'%' IDENTIFIED BY '<nueva>';` (o nueva variable en el servicio MySQL de Railway) | Railway (API, como referencia a la variable del servicio MySQL) | La API se cae hasta redesplegar con la URL nueva |
| `REVALIDATE_SECRET` | `openssl rand -base64 48` | Vercel (web) y Railway (API) | La revalidación del catálogo falla hasta igualar ambos |
| Llave de respaldos (`AGE_RECIPIENT`) | `age-keygen -o nueva.txt` | Donde corre `scripts/backup-mysql.sh` | **Guardar la llave privada vieja**: se necesita para descifrar respaldos anteriores |
| Tokens de cuentas (GitHub, Vercel, Railway, Cloudflare, CLI) | Panel de cada cuenta → Tokens / Sessions → revocar | `vercel login`, `railway login`, `gh auth login` de nuevo | Cierra sesiones de CLI |

### Checklist post-rotación
- [ ] `curl -s https://api.scartstudios.com/health` responde 200
- [ ] Login del admin funciona (y las sesiones viejas quedaron cerradas si se rotó JWT)
- [ ] Catálogo carga productos de Shopify; un checkout de prueba llega a PayPal
- [ ] Un formulario público pasa Turnstile
- [ ] Webhook de prueba de Shopify llega y valida HMAC
- [ ] Siguiente respaldo programado termina bien
- [ ] Secretos viejos revocados en cada proveedor
- [ ] Fecha de rotación anotada en `brain/` (sin valores)

## Restauración de respaldos
`scripts/backup-mysql.sh` genera `sc-art-studio-AAAAMMDD-HHMMSS.sql.gz.age` (dump de MySQL → gzip → cifrado con `age`) y lo sube con rclone a Google Drive (diario) y R2 (semanal). Retención: 7 diarios, 4 semanales, 6 mensuales.

**Llave privada de `age`:** nunca en el repo ni en Railway. Se guarda en el gestor de contraseñas y en una copia offline (USB cifrado). Sin ella los respaldos son irrecuperables.

**Objetivo de recuperación:** sitio operando en ≤ 2 h (RTO), con pérdida máxima de 24 h de datos (RPO, respaldo diario). Los pedidos y pagos viven en Shopify, no en esta base.

1. **Listar respaldos:** `rclone ls gdrive:respaldos/sc-art-studio` (o el remoto de R2).
2. **Descargar** el más reciente (o el de la fecha anterior al incidente):
   `rclone copy gdrive:respaldos/sc-art-studio/sc-art-studio-AAAAMMDD-HHMMSS.sql.gz.age ./restaurar/`
3. **Descifrar y descomprimir:**
   `age -d -i ~/ruta/llave-age.txt restaurar/<archivo>.sql.gz.age | gunzip > restaurar/restored.sql`
4. **Verificar integridad:** `tail -1 restaurar/restored.sql` debe mostrar `-- Dump completed`; `grep -c 'CREATE TABLE' restaurar/restored.sql` debe coincidir con las tablas del schema de Prisma.
5. **Probar en una base temporal:** `mysql -e 'CREATE DATABASE restore_test'` y `mysql restore_test < restaurar/restored.sql`; revisar conteos de `AdminUser`, `CostSettings` y `AuditLog`.
6. **Producción** (requiere confirmación humana): crear una base nueva en Railway, importar ahí, cambiar `DATABASE_URL` del servicio API a la nueva y redesplegar. No sobrescribir la base actual: queda como evidencia hasta cerrar el incidente.
7. **Post-restauración:** login del admin, catálogo, formulario de encargo y `npx prisma migrate status` sin migraciones pendientes.
8. **Limpiar:** borrar `restaurar/` (está fuera de Git por `*.sql` y `*.age`, pero no dejar dumps en disco).

## Plantilla de aviso a clientes
> **Asunto:** Aviso de seguridad de SC Art Studio
>
> Hola, te escribimos porque el [fecha] detectamos un acceso no autorizado a [sistema afectado]. Los datos que pudieron verse afectados son: [nombre, correo, dirección de envío…]. **No guardamos datos de tarjetas**: los pagos los procesan Shopify y PayPal.
>
> Lo que hicimos: [cerramos el acceso, cambiamos todas las claves, restauramos…]. Lo que te recomendamos: [estar atento a correos sospechosos que digan venir de nosotros…].
>
> Si tienes dudas, responde este correo. Un adulto de la familia responde los mensajes.

## Registro de restauraciones de prueba
Una vez al mes, pasos 1 a 5 de "Restauración de respaldos" en una base local. Anotar aquí:

| Fecha (AAAA-MM-DD) | Respaldo usado | Tablas / filas verificadas | Resultado | Persona (rol) |
|---|---|---|---|---|
