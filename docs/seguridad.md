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
- GitHub Actions: lint, typecheck, tests y `npm audit --audit-level=high` en cada push; si falla, no se despliega.
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

## Plan de incidentes (llenar por proyecto)
| Paso | Quién | Cómo |
|---|---|---|
| Detectar y avisar | | |
| Rotar secretos | | Vercel, Railway, plataforma de comercio, R2, JWT |
| Modo mantenimiento | | |
| Restaurar respaldo | | `scripts/backup-mysql.sh` (inverso con `age -d`) |
| Avisar a clientes | | |

## Registro de restauraciones de prueba
| Fecha | Respaldo usado | Resultado | Persona |
|---|---|---|---|
