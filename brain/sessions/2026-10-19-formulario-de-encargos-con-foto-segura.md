---
type: session
area: backend
date: 2026-10-19
slug: formulario-de-encargos-con-foto-segura
title: "Formulario de encargos con Turnstile y foto sin EXIF en R2 privado"
tags: [api, encargos, turnstile, r2, sharp, seguridad, privacidad]
status: active
related:
  - 2026-10-19-endpoints-publicos-historias-y-videos
  - 2026-10-17-scaffold-backend-express
sources:
  - repo:apps/api/src/routes/customRequests.ts
  - repo:apps/api/src/lib/turnstile.ts
  - repo:apps/api/src/lib/images.ts
  - repo:apps/api/src/lib/storage.ts
  - url:https://developers.cloudflare.com/r2/api/s3/presigned-urls/
  - url:https://developers.cloudflare.com/turnstile/troubleshooting/testing/
superseded_by: null
---

# Formulario de encargos con Turnstile y foto sin EXIF en R2 privado

## Contexto
Tarea 11 de Task Master (PRD §4.5, F4): `POST /api/custom-requests` para que un adulto pida una máscara personalizada, con foto de referencia opcional. A mitad de la tarea se levantó el sitio en local (`next dev -p 3200`) para que Guido viera cómo va; en el puerto 3000 ya corría otro proceso suyo.

## Decisiones
- **La foto pasa por la API, no por URL prefirmada (decisión de Guido).** La documentación de R2 confirma que un PUT prefirmado amarra el tipo de archivo pero no el tamaño (y no hay POST con `content-length-range`). Además, la foto llegaría con su EXIF/GPS, que puede revelar la casa del cliente. Por la API: multer en memoria con tope de 8 MB, formato detectado por el contenido (solo jpeg/png/webp, nunca por la extensión), `sharp` la orienta, la reduce a 2048 px como máximo, la re-codifica a webp sin metadatos y la sube a un **bucket privado** con un nombre aleatorio.
- **Orden para gastar poco con spam:** rate limit → tamaño → Zod → Turnstile → sharp → R2 → base. Si la base falla después de subir la foto, la foto se borra.
- **Turnstile:** `fetch` con timeout de 5 s y un solo reintento con la misma `idempotency_key`. Token rechazado → 403; Cloudflare caído o respuesta rara → 503 y no se guarda nada (nunca se aprueba por defecto).
- **Validación:** Zod estricto. El país es un código ISO 3166-1 alfa-2 real (`Intl.DisplayNames`, excluyendo uso privado y agrupaciones; XK = Kosovo sí). La fecha deseada debe existir y caer entre hoy y 2 años. Los campos opcionales vacíos de multipart cuentan como no enviados. El `status` siempre lo pone la API (`NEW`).
- **Rate limit:** el `FORM_RATE_LIMIT` existente (10 por hora por IP) en lugar de los 5 cada 15 minutos de la tarea, porque es más estricto por hora.
- **Variables:** `TURNSTILE_SECRET` y `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_PRIVATE_BUCKET`. Son opcionales en desarrollo (sin Turnstile la ruta no se monta; sin R2 se aceptan encargos sin foto) y obligatorias en producción (la API no arranca). `R2_PRIVATE_BUCKET` va aparte de `R2_BUCKET`, que será para las fotos públicas del catálogo.
- **Dependencias:** `multer` 2.4.0, `sharp` 0.35.5 y `@aws-sdk/client-s3` 3.1146.0 (la última con más de dos semanas; la del día no se usó). `npm audit --omit=dev` en 0.
- La respuesta solo trae el `id`; los datos del cliente no vuelven al navegador ni se escriben en los logs.

## Output
- Commit `2009f16`.
- Verificado: 169 pruebas de la API (98 % de cobertura), typecheck, lint y build. Con la API compilada contra el MySQL local y las llaves de prueba públicas de Turnstile (Cloudflare real): aprobado → 201 y fila `NEW` con país normalizado; rechazado → 403; con foto y sin R2 → 503 sin guardar; país inválido → 400; el envío 11 en una hora → 429. Los logs no tienen datos del formulario. La fila de prueba se borró.

## Pendiente
- [HUMANO] Crear en Cloudflare el bucket privado de R2 (sin dominio público ni `r2.dev`) y un token de API limitado a ese bucket, y el widget de Turnstile para `scartstudios.com`. Cargar los valores en Railway.
- Avisar al adulto responsable de cada encargo nuevo por correo (Resend), según el PRD.
- El formulario en la web (tarea de frontend) debe mandar `turnstileToken` y la foto en el campo `reference`. El esquema Zod vive en la API; si la web lo necesita igual, moverlo a `@sc-art-studio/shared` cuando ese paquete se compile.
- El admin necesitará ver la foto con una URL temporal firmada del bucket privado (lectura), nunca pública.

## Cross-refs
- [[2026-10-19-endpoints-publicos-historias-y-videos]] — misma sesión; el formulario es la primera ruta pública que escribe en la base.
- [[2026-10-17-scaffold-backend-express]] — usa su `FORM_RATE_LIMIT`, su manejador de errores y los logs sin datos personales.
- [[2026-10-20-cotizador-de-envio-sin-perdida]] — el cotizador de envío comparte `lib/countries.ts` con el formulario.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
- [Cloudflare R2: URLs prefirmadas](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare Turnstile: llaves de prueba](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
