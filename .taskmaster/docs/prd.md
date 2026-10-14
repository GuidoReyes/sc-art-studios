# PRD — SC Art Studio
Versión 2.1 · 13-oct-2026 (la v1.0 se llamaba "Scarlett Mask Studio") · Dueño del producto: Guido Reyes ("Ingeniero") · Artista: Scarlett
Destino: `.taskmaster/docs/prd.md` → `task-master parse-prd` → Claude Code ejecuta tarea por tarea.

<context>

# 0. Cómo usar este PRD (instrucciones para Claude Code)

1. Este proyecto se construye **igual que MEA International**: frontend Next.js/TypeScript en Vercel, backend Node.js/Express/TypeScript/Prisma en Railway, DNS en Cloudflare con proxy apagado para los registros que apuntan a Vercel, y Task Master para el árbol de tareas.
2. Trabaja **por fases y en orden** (sección "Development Roadmap"). No empieces una fase si la anterior no pasó su checklist de QA.
3. Cada fase sigue el ciclo de MEA: **auditar → implementar → QA**. Al cerrar cada tarea: commit pequeño, mensaje en español, y actualiza el estado en Task Master.
4. Antes de escribir UI, carga el skill `frontend-design`. Para Vercel usa el plugin/CLI oficial de Vercel; para Railway, la CLI `railway`; para Shopify, la documentación oficial de Storefront API y Admin GraphQL API.
5. Si en la máquina existe un skill o carpeta de memoria del proyecto ("brain", `AGENTS.md`, `.agents/`, `CLAUDE.md`), léelo primero y respeta sus reglas. Si no existe, créalo en la Fase 1 (tarea 1.4).
6. Todo lo marcado **[HUMANO]** lo hace Guido: compras, cuentas, pagos, verificaciones de identidad. Claude Code prepara todo y se detiene, deja el paso exacto escrito, y espera confirmación.
7. Nunca subas secretos al repositorio. Todos los tokens van en `.env` local (en `.gitignore`), en Vercel Environment Variables y en Railway Variables.
8. Todo precio, tarifa o costo que en este PRD diga **SUPUESTO** se guarda como dato configurable en la base de datos, nunca fijo en el código.

# 1. Overview

**Qué es:** SC Art Studio es la tienda en línea y la plataforma de contenido del arte de Scarlett. Empieza con máscaras y deja espacio para otras líneas de arte en el futuro. Vende máscaras de madera pintadas a mano por Scarlett, una artista guatemalteca de 11 años, y máscaras personalizadas por encargo. El sitio cuenta su historia con videos de cómo las pinta.

**Problema que resuelve:**
- Hoy solo existe un diseño estático (HTML de referencia y una versión "libro" publicada como artifact). No hay catálogo, pagos, inventario ni forma de subir modelos nuevos.
- Las artesanías se venden por la historia del artista. La competencia (ver Apéndice A) siempre pone el nombre y la historia del artesano junto al producto. Scarlett ya tiene esa historia, pero no hay dónde contarla ni dónde comprar.
- Enviar desde Guatemala es caro y confuso. Sin un cálculo correcto de costos, cada venta internacional puede dar pérdida.

**Para quién:**
1. Compradores internacionales (prioridad EE. UU., luego Canadá, México y Europa) que buscan arte popular guatemalteco hecho a mano y regalos únicos.
2. Compradores en Guatemala (regalos, decoración, coleccionistas locales).
3. Personas que quieren una máscara personalizada (su mascota, el animal favorito de su hijo, los colores de su marca).
4. Seguidores de YouTube, TikTok e Instagram que llegan por los videos.

**Valor:** cada máscara es única y viene con su historia, su video de creación y una tarjeta firmada por Scarlett. El backend está pensado para que subir un modelo nuevo tome menos de 5 minutos desde el celular.

**Nombre y marca:** el nombre oficial es **SC Art Studio** (antes "Scarlett Mask Studio"). La artista se presenta como Scarlett. En el logo y en los textos se escribe siempre "SC Art Studio", con espacio entre "SC" y "Art", para que nadie lea "Scart". El dominio `scartstudio.com` ya está ocupado; los disponibles están en la Sección 4.11.

# 2. Core Features

## F1. Catálogo de máscaras (vitrina)
- Qué hace: lista las máscaras con foto, nombre, animal, estado (disponible / reservada / vendida / por encargo) y precio en USD (y en GTQ para Guatemala).
- Por qué importa: es la vitrina principal; las piezas vendidas se quedan visibles como portafolio ("Vendida — pide una parecida").
- Cómo funciona: Shopify es la fuente de verdad del producto, el precio y el inventario (1 unidad por pieza única). El backend guarda la información editorial (historia, videos, medidas, costos) y la une al producto de Shopify por `shopifyProductId`.

## F2. Ficha de máscara con historia y video
- Galería de fotos, medidas reales (cm y pulgadas), peso, materiales, la historia de esa máscara contada por Scarlett, y el video de cómo se hizo (YouTube, TikTok o Instagram incrustado).
- Botón "Comprar" (carrito de Shopify) y botón "Quiero una parecida" (lleva a F4 con la máscara como referencia).

## F3. Carrito y pago con Shopify (headless)
- El frontend usa la Storefront API de Shopify para el carrito. El pago ocurre en el checkout de Shopify (`checkoutUrl`) bajo un subdominio propio (`shop.<dominio>`).
- Pasarela: ver Sección "Pagos" en la arquitectura. Shopify Payments **no** está disponible para comercios en Guatemala.

## F4. Máscaras personalizadas (encargos)
- Formulario: animal o idea, colores, tamaño, uso (pared, disfraz, regalo), foto de referencia, país de envío, fecha deseada, WhatsApp y correo.
- Flujo: solicitud → Guido cotiza desde el admin → el cliente paga **anticipo 50%** en Shopify → Scarlett pinta (se graba el proceso) → se cobra el saldo con un Draft Order de Shopify → envío.
- Por qué importa: el encargo tiene mejor margen, crea contenido (el video del encargo) y no depende de tener inventario.

## F5. Historias y videos de Scarlett
- Sección "Historias" (artículos cortos con fotos) y sección "Videos" que reúne lo publicado en YouTube, TikTok e Instagram.
- Cada historia o video se puede vincular a una máscara, y la ficha de la máscara muestra sus videos.
- Fase MVP: incrustar por URL con oEmbed. Fase 2: sincronización automática con YouTube Data API v3 (y APIs de Meta y TikTok si se aprueban las apps).

## F6. Panel de administración (backend acoplado)
- Login seguro (contraseña con argon2 o bcrypt, nunca en texto plano; 2FA por correo opcional).
- "Subir nueva máscara" en un solo formulario móvil: fotos → nombre, animal, historia, medidas, peso → costo de materiales y horas → el sistema **sugiere el precio** (F7) → al guardar crea el producto en Shopify, sube las imágenes, guarda todo en la base de datos y refresca el sitio.
- Gestión de encargos, historias, videos, tarifas de envío y parámetros de costos.

## F7. Motor de costos y precios
- Calcula el costo real por pieza y el precio de venta sugerido por margen, y cotiza el envío por país y peso con las tarifas cargadas en la base de datos.
- Ver la Sección 6 (modelo de precios con números y fórmulas).

## F8. Envíos internacionales y nacionales
- Tabla de zonas y tarifas por transportista (FedEx, opción postal, couriers locales) editable en el admin, con fecha de vigencia y fuente.
- Página pública "Envíos, aranceles y tiempos" que explica qué paga el comprador.

## F9. Redes sociales vinculadas
- Enlaces y feeds de YouTube, TikTok e Instagram en el pie y en la sección Videos.
- Botones para compartir cada máscara.
- Plantilla de texto para publicar cada máscara nueva (descripción, hashtags y enlace con UTM).

## F10. Contacto por WhatsApp
- Botón de WhatsApp con mensaje prellenado ("Hola, me interesa la máscara Jaguar Dorado"), atendido por un adulto de la familia.

# 3. User Experience

## Personas
- **Emily (EE. UU., 38 años):** vio un TikTok de Scarlett pintando un jaguar. Quiere regalarlo. Necesita saber el precio final con envío y aranceles antes de pagar.
- **Carlos (Guatemala, 45 años):** quiere una máscara de su perro para su oficina. Usa WhatsApp, prefiere pagar con tarjeta local.
- **Guido (admin):** sube una máscara nueva desde el iPhone en el taller. Tiene poco tiempo y quiere que el precio salga calculado solo.
- **Scarlett (artista, menor de edad):** no usa el admin ni recibe mensajes directos. Aparece en contenido supervisado.

## Flujos clave
1. Video en redes → ficha de la máscara → "Comprar" → checkout Shopify → confirmación → correo con seguimiento.
2. Inicio → "Personalizada" → formulario → cotización por correo y WhatsApp → pago del anticipo → videos de avance → pago del saldo → envío.
3. Admin: "Nueva máscara" → fotos → datos → precio sugerido → Publicar → la máscara aparece en el sitio y en Shopify.

## Diseño (basado en el HTML existente "Mascarlet - Página principal")
- Paleta (tokens): tinta `#1B1B1B`, crema `#FFF6E8`, rosa `#E8307A` (acento), morado `#6B3FA0`, turquesa `#1FA6A0`, naranja `#F28C28`.
- Tipografía: display `Bagel Fat One`, texto `Nunito` (400/600/800), ambas de Google Fonts, con fallback de sistema.
- Lenguaje visual: botones píldora, bordes negros gruesos (4px) y radios grandes (24–28px) en fotos y tarjetas, bloques de color sólido por sección.
- Elemento firma: el modo "libro" (hojear páginas con flecha) ya prototipado. Úsalo en la página "Sobre Scarlett" y como lookbook de colecciones, no como navegación principal (no es bueno para SEO ni para comprar rápido).
- Sitio bilingüe **inglés / español** desde el MVP (el mercado principal es EE. UU.). Rutas `/en/...` y `/es/...` con `next-intl` o i18n de App Router.
- Móvil primero: la mayoría del tráfico vendrá de TikTok e Instagram.

## Estructura de páginas (base para páginas futuras)
| Ruta | Contenido |
|---|---|
| `/` | Hero con video corto, colección destacada, "Conoce a Scarlett", últimos videos, cómo comprar |
| `/mascaras` | Catálogo con filtros (animal, estado, precio) |
| `/mascaras/[slug]` | Ficha con galería, historia, video, medidas, envío estimado por país |
| `/personalizada` | Formulario de encargo + ejemplos de encargos anteriores |
| `/historias`, `/historias/[slug]` | Historias de Scarlett |
| `/videos` | Feed de YouTube, TikTok e Instagram |
| `/sobre-scarlett` | Modo libro + datos de la artista (sin datos personales sensibles) |
| `/envios` | Tarifas, tiempos, aranceles, empaque |
| `/faq`, `/contacto` | Preguntas frecuentes, WhatsApp y correo |
| `/privacidad`, `/terminos`, `/devoluciones` | Legales |
| `/admin/*` | Panel (protegido, `noindex`) |

Componentes reutilizables (carpeta `components/`): `Header`, `Footer`, `MaskCard`, `MaskGallery`, `StatusPill`, `PriceTag` (USD/GTQ), `VideoEmbed` (YouTube/TikTok/Instagram), `StoryCard`, `BookViewer`, `ShippingEstimator`, `CustomOrderForm`, `WhatsAppButton`, `SocialLinks`, `SectionBlock` (fondo de color de la paleta). Cada página nueva se arma con estos bloques.

</context>

<PRD>

# 4. Technical Architecture

## 4.1 Mapa del sistema
```
Comprador ──► sc-artstudio.com (Next.js en Vercel)
                 │  Storefront API (carrito, productos)
                 ├──────────────► Shopify (productos, inventario, checkout en shop.<dominio>)
                 │                     │ webhooks (orders/paid, products/update)
                 │  REST /api/*        ▼
                 └──────────────► api.<dominio> (Express + Prisma en Railway) ──► MySQL (Railway)
                                       │              └──► Cloudflare R2 (fotos originales, clips)
                                       └──► YouTube Data API / oEmbed (videos)
DNS: Cloudflare (registros a Vercel y a Railway en "DNS only", como en MEA)
```

## 4.2 Stack (idéntico a MEA salvo donde se indica)
| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind o CSS Modules con tokens | En Vercel |
| Backend | Node.js + Express + TypeScript + Prisma + Zod | En Railway |
| Base de datos | MySQL en Railway | Igual que MEA. Postgres también sirve con Prisma si se prefiere |
| Comercio | Shopify plan Basic (Storefront API + Admin GraphQL API) | Shopify = fuente de verdad de producto, precio, inventario y pedidos |
| Archivos | Cloudflare R2 | Fotos en alta resolución y clips cortos. Videos largos viven en YouTube |
| DNS | Cloudflare | Dominio comprado en Vercel, nameservers apuntados a Cloudflare |
| Correo transaccional | Notificaciones de Shopify + Resend (o similar) para encargos | |
| Anti-spam | Cloudflare Turnstile en formularios públicos | |
| Monitoreo | Logs de Vercel y Railway; alertas por correo | |
| Tareas | Task Master (`task-master-ai`) | |

## 4.3 Repositorio
Monorepo con dos apps (como MEA, separadas para desplegar cada una en su plataforma):
```
sc-art-studio/
├── apps/
│   ├── web/                # Next.js → Vercel (Root Directory: apps/web)
│   └── api/                # Express + Prisma → Railway (Root Directory: apps/api)
├── packages/
│   └── shared/             # tipos TS y schemas Zod compartidos
├── .taskmaster/docs/prd.md
├── CLAUDE.md               # reglas del proyecto para Claude Code
├── AGENTS.md
└── README.md
```

## 4.4 Modelo de datos (Prisma, MySQL)
- `Mask`: id, slug (único), nameEs, nameEn, animal, descriptionEs/En, storyEs/En, status (`AVAILABLE | RESERVED | SOLD | COMMISSION_EXAMPLE | DRAFT`), shopifyProductId, shopifyVariantId, priceUsd (Decimal), priceGtq (Decimal), weightGrams, lengthCm, widthCm, heightCm, materialsCostGtq, laborHours, packagingProfileId, featured (bool), publishedAt, createdAt, updatedAt.
- `MaskImage`: id, maskId, r2Key, shopifyMediaId, alt (es/en), sortOrder.
- `Story`: id, slug, titleEs/En, bodyEs/En (MDX o texto enriquecido), coverR2Key, maskId (opcional), publishedAt.
- `Video`: id, platform (`YOUTUBE | TIKTOK | INSTAGRAM`), url, externalId, title, thumbnailUrl, maskId (opcional), storyId (opcional), publishedAt, source (`MANUAL | SYNC`).
- `CustomRequest`: id, name, email, whatsapp, country, idea, colors, size, use, referenceR2Key, desiredDate, status (`NEW | QUOTED | DEPOSIT_PAID | IN_PROGRESS | BALANCE_PAID | SHIPPED | CLOSED | REJECTED`), quoteUsd, depositUsd, shopifyDepositOrderId, shopifyDraftOrderId, notes, createdAt.
- `ShippingZone`: id, code, name, countries (JSON con códigos ISO).
- `ShippingRate`: id, carrier (`FEDEX | POSTAL | COURIER_LOCAL | OTHER`), service, zoneId, maxWeightKg (Decimal), costUsd (Decimal), validFrom, validTo, source (texto con URL o "cotización <fecha>"), isEstimate (bool).
- `PackagingProfile`: id, name, innerCm, outerLengthCm, outerWidthCm, outerHeightCm, packagingWeightGrams, costGtq.
- `CostSettings` (una fila, versionada): fxUsdGtq, gatewayPct, gatewayFixedUsd, shopifyThirdPartyPct, monthlyFixedUsd, expectedUnitsPerMonth, laborRateGtqPerHour, targetMarginPct, volumetricDivisor, usImportDutyPct, updatedAt, updatedBy.
- `Order` (espejo de Shopify vía webhook): id, shopifyOrderId, maskId, totalUsd, shippingCountry, carrier, trackingNumber, status, createdAt.
- `SocialAccount`: platform, handle, url, managedBy (nombre del adulto responsable).
- `AdminUser`: email, passwordHash (argon2id), role, lastLoginAt. `AuditLog`: userId, action, entity, entityId, diff, createdAt.

## 4.5 API del backend (Express)
Públicas (con caché y rate limit):
- `GET /api/masks?status=&animal=` · `GET /api/masks/:slug`
- `GET /api/stories` · `GET /api/stories/:slug` · `GET /api/videos?maskId=`
- `POST /api/custom-requests` (Zod + Turnstile + subida de referencia con URL prefirmada de R2)
- `POST /api/shipping/quote` → `{country, maskId | weightGrams+dims}` → opciones de envío con costo y precio al cliente
Admin (JWT en cookie httpOnly, `SameSite=Lax`, CSRF token):
- CRUD de masks, stories, videos, shipping rates, packaging profiles, cost settings, custom requests
- `POST /api/admin/masks/:id/publish` → crea o actualiza en Shopify (`productCreate`/`productUpdate`, media, inventario = 1) y llama al endpoint de revalidación del frontend
- `POST /api/admin/pricing/suggest` → precio sugerido (F7)
- `POST /api/admin/custom-requests/:id/draft-order` → crea Draft Order de Shopify para el saldo y envía la factura
Webhooks:
- `POST /webhooks/shopify` → verificar firma HMAC (`X-Shopify-Hmac-Sha256`) con el secreto de la app; manejar `orders/paid` (marcar máscara `SOLD`, crear `Order`, notificar por correo/WhatsApp al adulto), `products/update`, `inventory_levels/update`. Responder en menos de 5 s; procesar en cola si hace falta.

## 4.6 Frontend (Next.js)
- Datos de producto desde Shopify Storefront API (GraphQL) + datos editoriales desde `api.<dominio>`; unir por `shopifyProductId`.
- ISR con revalidación bajo demanda (`/api/revalidate?secret=`) cuando el admin publica.
- Carrito con Storefront `cartCreate`/`cartLinesAdd`; checkout redirige a `cart.checkoutUrl`.
- `next/image` con dominios de R2 y de Shopify CDN permitidos.
- SEO: metadata por página, `Product` JSON-LD en cada ficha, sitemap, `robots.txt`, Open Graph con foto de la máscara.
- Analítica: Vercel Analytics + UTM en todos los enlaces de redes.

## 4.7 Pagos (decisión importante)
- Hecho verificado: Shopify Payments funciona en 41 países y **Guatemala no está en la lista**; fuera de esa lista se usa un proveedor externo ([Shopify Help](https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries)).
- Con un proveedor externo, Shopify cobra una comisión adicional: **2% en Basic**, 1% en Grow, 0.6% en Advanced ([shopify.com/pricing](https://www.shopify.com/pricing)).
- **Opción MVP recomendada: PayPal** como proveedor en Shopify (acepta tarjeta y saldo PayPal). PayPal Guatemala cobra **5.40% + US$0.30** por pago comercial internacional recibido en USD ([PayPal GT](https://www.paypal.com/gt/webapps/mpp/merchant-fees)). BAM anunció el 7-oct-2026 retiros de PayPal a cuentas BAM ([nota](https://newsinamerica.com/pdcc/noticias/gerenciales/2026/bam-anuncia-su-nueva-alianza-con-paypal-en-la-innovacion-de-pagos-digitales-y-retiros-a-cuentas-locales/)); las comisiones de retiro **no puedo confirmarlas**.
- Opciones a evaluar para tarjeta local en GTQ: Recurrente (una guía dice que se integra con Shopify de forma manual; **no puedo confirmar** que tenga app oficial ni sus comisiones), BAC Credomatic o Pagadito vía apps de terceros ([CartDNA](https://cartdna.com/es-mx/shopify-payment-guide/central-america/guatemala), [andreybusiness](https://www.andreybusiness.com/guatemala/shopify)).
- Opción a futuro: una LLC en EE. UU. permitiría usar Shopify Payments (EE. UU. sí está en la lista) y quitar el 2% extra. Es una decisión legal y fiscal: consultar con un contador antes.
- [HUMANO] La cuenta de Shopify, la pasarela y la facturación van a nombre de un adulto responsable, no de Scarlett.

### Opción A — PayPal (cuenta en Guatemala)
La descrita arriba. Sirve para arrancar sin abrir empresa en EE. UU. Comisiones: 2% Shopify + 5.40% + US$0.30 PayPal.

### Opción B — Shopify Payments con la cuenta bancaria en EE. UU. de la mamá de Scarlett
Shopify Payments sí funciona en EE. UU., y con él Shopify **no cobra el 2% extra** por proveedor externo. Requisitos oficiales de Shopify para EE. UU. ([Shopify Help](https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries/united-states/requirements)):
- Cuenta de cheques (checking) completa en un banco de EE. UU., en USD y habilitada para ACH. Las cuentas de ahorro no reciben pagos.
- Dirección física del negocio en EE. UU., "donde ocurren principalmente las operaciones", con documentos de comprobación de los últimos 6 meses.
- Persona individual: SSN o ITIN válido; Shopify dice que ese requisito "no se puede saltar".
- Sole proprietorship (negocio unipersonal): EIN del negocio, más SSN o ITIN de la dueña.
- Individuos y sole proprietorships **deben vivir en EE. UU.** Las empresas (por ejemplo una LLC) pueden tener a la representante viviendo en otro país; las personas sin SSN o ITIN pueden verificar con pasaporte solo si no son individuo ni sole proprietorship.

Qué significa para la familia:
- **B1 — La mamá vive en EE. UU. y tiene SSN o ITIN:** puede abrir la tienda como individuo o sole proprietor con su dirección y su cuenta checking. Es el camino más simple.
- **B2 — La mamá vive en Guatemala:** no puede usar Shopify Payments como individuo aunque tenga cuenta en EE. UU. Necesitaría una empresa en EE. UU. (LLC con EIN), dirección comercial en EE. UU. y la cuenta checking a nombre de la empresa. Riesgo: Shopify pide que la dirección sea donde ocurren principalmente las operaciones y las máscaras se hacen y se envían desde Guatemala. Revisar esto con un contador o abogado antes de abrir, porque una verificación rechazada congela los pagos.
- En ambos casos: Shopify reporta las ventas al IRS con el formulario 1099-K, y la dueña de la cuenta declara esos ingresos. Consultar con un contador en EE. UU. y otro en Guatemala sobre cómo se declaran las ventas y cómo pagarle a Scarlett por su trabajo. No soy contador ni abogado; esto es información para decidir, no asesoría.
**Situación confirmada (13-oct-2026): la mamá de Scarlett tiene SSN pero vive en Guatemala → escenario B2.**
- No puede abrir Shopify Payments como individuo ni como sole proprietor, aunque tenga SSN y cuenta en EE. UU., porque Shopify exige que esos dos tipos vivan en EE. UU.
- El SSN sí ayuda: le sirve para la verificación de identidad como representante de una empresa y evita tramitar un ITIN.
- Para usar Shopify Payments necesita: (1) una LLC en EE. UU. a su nombre, (2) EIN de la LLC, (3) cuenta de cheques en EE. UU. **a nombre de la LLC** (una guía indica que la cuenta personal no se acepta y que el nombre debe coincidir con la LLC ([terms.law](https://terms.law/Invest-USA/bank-compliance/shopify-payments.html)); la página oficial de Shopify no lo dice, así que confirmar con el banco), (4) dirección comercial en EE. UU.
- Costo de ejemplo de la LLC en Wyoming: US$100 al registrarla y mínimo US$60 al año de reporte anual ([Secretaría de Estado de Wyoming](https://sos.wyo.gov/Business/Docs/BusinessFees.pdf)). Falta sumar el agente registrado y la dirección comercial, que **no pude verificar** y hay que cotizar.
- Riesgo principal: Shopify pide que la dirección del negocio sea donde ocurren principalmente las operaciones, y las máscaras se hacen y se envían desde Guatemala. Una dirección virtual podría no pasar la verificación. Esto lo debe revisar un contador o abogado de EE. UU. antes de abrir.
- Impuestos: con SSN, la mamá puede tener obligaciones de declarar en EE. UU. aunque viva en Guatemala, y la LLC suma sus propios formularios. Consultar con un contador de EE. UU. que trabaje con estadounidenses en el extranjero, y con un contador en Guatemala.

**Decisión para el PRD:** lanzar con la **opción A (PayPal)**, que no necesita empresa en EE. UU. En paralelo, la familia consulta con un contador si la LLC conviene. Pasar a la opción B solo cuando Shopify apruebe la verificación. Mantener PayPal configurado como respaldo. Punto de equilibrio para decidir: con opción B se ganan unos US$4.27 más por máscara de US$95 (43.87 − 39.60), así que el costo anual de la LLC, del agente y del contador se recupera solo con suficientes ventas (calcularlo en la Fase 8 con los costos reales cotizados).

- Comisiones de Shopify Payments en el plan Basic: **2.9% + US$0.30** con tarjetas de EE. UU. y **+1%** con tarjetas internacionales ([shopify.com/pricing](https://www.shopify.com/pricing)). Comparación en la Sección 6.3.
- Implementación: el código no cambia entre A y B. La pasarela se configura en Shopify, y en `CostSettings` se cambian `gatewayPct`, `gatewayFixedUsd` y `shopifyThirdPartyPct` (0 con Shopify Payments). La dueña de la tienda (la mamá) crea una cuenta de colaborador o personal para Guido con permisos limitados; Guido nunca usa las credenciales de ella.

## 4.8 Capas de seguridad (todas las de MEA desde el día 1)
Estas son las capas que se aplicaron o se planearon en MEA (fase 0 de remediación OWASP, corrección de contraseñas, agente de ciberseguridad con respaldos automáticos) más el resto del OWASP Top 10. Nota: no pude leer el repo de MEA en esta sesión; si en MEA existe una capa que no esté aquí, Claude Code debe copiarla también y anotarla en `CLAUDE.md`.

**Capa 1 — Identidad y acceso**
- Contraseñas solo con argon2id (o bcrypt con costo ≥ 12). Nunca en texto plano, nunca visibles para el admin (error que se corrigió en MEA).
- JWT de vida corta (15 min) + refresh token rotativo en cookie `httpOnly`, `Secure`, `SameSite=Lax`; token CSRF en formularios del admin.
- Bloqueo tras 5 intentos fallidos durante 15 minutos; aviso por correo de inicio de sesión nuevo.
- Roles: `OWNER` (mamá/Guido), `EDITOR` (subir máscaras e historias), sin permisos de borrar pedidos.
- 2FA obligatorio en todas las cuentas externas: GitHub, Vercel, Railway, Cloudflare, Shopify, PayPal, banco, Google, YouTube, TikTok, Instagram.

**Capa 2 — Secretos**
- Secretos solo en `.env` local (en `.gitignore`), Vercel Environment Variables y Railway Variables. `.env.example` sin valores.
- GitHub secret scanning y push protection activados (Fase 1.6). Escaneo local antes de cada push con `gitleaks` (hook de pre-commit).
- Token de Shopify Admin solo en el backend; en el frontend solo el token público de Storefront.
- Rotar secretos cada 6 meses o de inmediato si se filtran; procedimiento escrito en `docs/seguridad.md`.

**Capa 3 — Validación de entradas y salidas**
- Zod en cada ruta del backend (body, query, params) y en formularios del frontend. Rechazar campos desconocidos.
- Prisma con consultas parametrizadas (nada de SQL armado con texto). Escapar todo contenido de usuario al mostrarlo; el texto enriquecido de historias se sanitiza (DOMPurify o `sanitize-html`).
- Subidas: solo `image/jpeg`, `image/png`, `image/webp`, `video/mp4`; tamaño máximo; re-codificar imágenes con `sharp` y borrar EXIF/GPS.

**Capa 4 — Transporte y cabeceras**
- HTTPS en todo (Vercel y Railway emiten certificados). HSTS.
- Helmet en Express; en Next.js, cabeceras `Content-Security-Policy` (permitir solo Shopify, YouTube, TikTok, Instagram, R2 y Turnstile), `X-Frame-Options: DENY` en admin, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva.
- CORS del API limitado a los dominios propios.

**Capa 5 — Perímetro y abuso**
- Rate limiting en el API (general y más estricto en login, formularios y cotizador de envío).
- Cloudflare Turnstile en formularios públicos (encargos, contacto).
- Como en MEA, los registros que apuntan a Vercel van con proxy de Cloudflare apagado (DNS only); la protección de esos dominios la da el firewall de Vercel. Activar en Vercel las reglas de firewall para `/admin` y `/api` (el plan Hobby permite 3 reglas; Pro, más).
- `/admin` con `noindex`, sin enlaces públicos, y opcionalmente restringido por país o IP en el firewall de Vercel.

**Capa 6 — Integraciones**
- Webhooks de Shopify verificados con HMAC y rechazo de repetidos (guardar el ID del webhook procesado). Igual que la verificación de webhooks de Meta en MEA.
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
- Rama `main` protegida (Fase 1.6).

**Capa 10 — Agente de ciberseguridad (como en MEA)**
- Tarea programada semanal que: revisa `npm audit`, cabeceras de seguridad del sitio (por ejemplo con `curl -I`), certificados próximos a vencer, último respaldo exitoso, cuentas admin activas, y envía un reporte por correo o Telegram.

**Capa 11 — Equipo de desarrollo**
- Mac con FileVault, bloqueo automático y el mismo stack de seguridad del homelab (LittleSnitch, Wazuh, Malwarebytes).
- Claude Code no ejecuta comandos destructivos en producción sin confirmación humana.

**Capa 12 — Privacidad y protección de la menor** — ver Sección 4.9.

**Capa 13 — Respuesta a incidentes**
- `docs/seguridad.md` con: a quién avisar, cómo rotar todos los secretos, cómo poner el sitio en modo mantenimiento, cómo restaurar el último respaldo, y cómo avisar a clientes si hubo fuga de datos.

## 4.9 Protección de la menor (requisito obligatorio, no opcional)
- Instagram y la mayoría de plataformas exigen **13 años o más** para tener cuenta ([Instagram Help](https://help.instagram.com/517920941588885)). Las cuentas de YouTube, TikTok e Instagram deben ser de la marca y estar administradas por un adulto; Scarlett aparece en el contenido, pero no es titular ni administradora.
- El sitio **no publica**: grado escolar, nombre de la escuela, apellido completo, ciudad o barrio, ni rutinas. (El HTML de referencia dice "cuarto grado": quitarlo.) La ubicación pública es solo "Guatemala".
- Sin mensajes directos ni chat hacia Scarlett. Todo contacto va al WhatsApp y al correo del adulto.
- Comentarios moderados en redes; en el sitio no hay comentarios públicos.
- Videos sin metadatos de ubicación (quitar GPS de fotos antes de subir; el backend borra EXIF al procesar imágenes con `sharp`).
- YouTube: según la FTC, que salga una niña no hace que el contenido sea "dirigido a niños" por sí solo; se evalúan tema, lenguaje, audiencia y otros factores ([FTC](https://www.ftc.gov/business-guidance/blog/2019/11/youtube-channel-owners-your-content-directed-children)). [HUMANO] Decidir la clasificación de cada video con ese criterio; el contenido apunta a compradores adultos.
- Copy del sitio: "Un adulto de la familia responde los mensajes" en contacto y en el checkout.

## 4.10 Infraestructura y costos fijos verificados (13-oct-2026)
| Concepto | Costo | Fuente |
|---|---|---|
| Dominio principal (recomendado `sc-artstudio.com`) | US$11.25/año (renovación igual) | API de precios de Vercel, consultada hoy; disponible (Sección 4.11) |
| Vercel Pro | US$20/mes por asiento de desarrollador | [vercel.com/pricing](https://vercel.com/pricing). El plan Hobby es solo uso personal no comercial; procesar pagos o anunciar productos exige Pro ([Fair Use](https://vercel.com/docs/limits/fair-use-guidelines)). Si el equipo de Vercel de MEA ya es Pro, este proyecto puede vivir ahí sin asiento extra |
| Railway Hobby | US$5/mes mínimo (incluye US$5 de uso) | [railway.com/pricing](https://railway.com/pricing) |
| Shopify Basic | US$29/mes pagando anual, US$39/mes mensual | [shopify.com/pricing](https://www.shopify.com/pricing) |
| Cloudflare DNS | US$0 | — |
| Cloudflare R2 | Gratis hasta 10 GB-mes; luego US$0.015/GB-mes; sin costo de salida | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| **Total mensual estimado** | **≈ US$54.94 ≈ Q420** | 29 + 20 + 5 + (11.25 ÷ 12) = 54.94; × 7.645 = Q420.0 |

## 4.11 Dominios para "SC Art Studio" (disponibilidad y precio consultados en la API de Vercel el 13-oct-2026)
`scartstudio.com` **no está disponible**. Opciones libres:
| Dominio | 1er año | Renovación | Comentario |
|---|---|---|---|
| **`sc-artstudio.com`** | US$11.25 | US$11.25 | **Recomendado.** `.com` con el nombre exacto; el guion separa "SC" de "Art". Al dictarlo hay que decir "con guion" |
| `scartstudios.com` | US$11.25 | US$11.25 | Sin guion, pero en plural ("Studios") |
| `thescartstudio.com` | US$11.25 | US$11.25 | Sin guion; más largo |
| `scartstudiogt.com` | US$11.25 | US$11.25 | Dice que es de Guatemala; útil como redirección |
| `scartstudio.net` | US$13.50 | US$13.50 | Alternativa barata a `.com` |
| `scartstudio.art` | US$5.99 | US$25.00 | Bonito para arte; buen dominio secundario |
| `scartstudio.co` | US$29.99 | US$24.80 | Se confunde con `.com` |
| `scart.studio` | US$21.99 | US$45.76 | Corto, renovación cara |
| `scartstudio.gallery` | US$34.85 | US$31.95 | Caro |
| `scartstudio.shop` | US$2.99 | US$38.39 | Barato el primer año, caro al renovar |
| `scartstudio.store` | US$1.99 | US$44.00 | Barato el primer año, caro al renovar |
Recomendación: comprar `sc-artstudio.com` como principal y `scartstudio.art` como secundario que redirige al principal. Costo del primer año: 11.25 + 5.99 = US$17.24; desde el segundo año: 11.25 + 25.00 = US$36.25 al año. Antes de comprar, revisar que no haya una marca registrada igual en el país de venta principal (búsqueda rápida en USPTO).

# 5. Development Roadmap (fases para Task Master)

Cada fase termina con su "Checklist QA". No se avanza sin pasarlo.

## Fase 0 — Decisiones y cuentas [HUMANO]
0.1 Elegir el dominio principal de la tabla de la Sección 4.11. Pagos: arrancar con la opción A (PayPal); la opción B (Shopify Payments con LLC de la mamá de Scarlett) queda como mejora posterior según la Sección 4.7.
0.1b [HUMANO] Cita con un contador de EE. UU. (y uno en Guatemala) para decidir la LLC: costo total anual, impuestos de la mamá con SSN viviendo en Guatemala, y si la dirección comercial pasará la verificación de Shopify.
0.2 Crear (a nombre del adulto responsable; si se elige la opción B, la dueña de la tienda en Shopify es la mamá de Scarlett y Guido entra como colaborador o personal): cuenta de Shopify (plan Basic), PayPal Business (solo opción A), cuenta de Cloudflare (o usar la de MEA), Railway (o usar la de MEA), equipo de Vercel.
0.3 Crear o reclamar las cuentas de marca: YouTube (canal de marca), TikTok, Instagram (cuenta profesional ligada a una página de Facebook, necesario para la API de Meta), todas administradas por el adulto. Mismo handle en las tres si está libre.
0.4 Reunir datos reales para el motor de costos: costo de la máscara en blanco y materiales por pieza, horas promedio por máscara, peso y medidas de 3 máscaras reales, y cotización de 2 tamaños de caja y relleno.
0.5 Cotizar envío real de 1 paquete de prueba (ver Fase 6): FedEx con cuenta, Guatex a EE. UU. (tarificador), y consultar en Correos de Guatemala si aceptan envíos comerciales y su tarifa.
Checklist QA: todas las cuentas creadas, 2FA activado en todas, datos de costos entregados en una hoja.

## Fase 1 — Carpeta en la Mac, repositorio en GitHub (dos copias) y dominio
Objetivo: desde el primer minuto el proyecto existe en **dos lugares**: la carpeta en la Mac (copia de trabajo) y el repositorio privado en GitHub (copia remota). Más una tercera copia automática del disco (regla 3-2-1: 3 copias, 2 medios, 1 fuera de casa).

1.1 Crear la carpeta del proyecto en la Mac a partir de la plantilla (ver Apéndice D). La carpeta `~/Developer/sc-art-studio` ya existe y contiene este PRD; se completa con la plantilla sin sobrescribir nada:
```bash
mkdir -p ~/Developer/sc-art-studio
rsync -a --ignore-existing ~/Developer/_plantillas/stack-web-mea/ ~/Developer/sc-art-studio/
cd ~/Developer/sc-art-studio && ls -la && test -f .taskmaster/docs/prd.md && echo "PRD OK"
```
1.2 Revisar que `.gitignore` incluya `.env`, `.env.*` (menos `.env.example`), `node_modules`, `.next`, `dist`, `*.pem`, `*.key`, respaldos `*.sql` y `.DS_Store`. Ningún secreto entra al repositorio.
1.3 Inicializar Git localmente (copia 1):
```bash
git init -b main
git config user.name "Guido Reyes"
git config user.email "<correo de GitHub>"
git add . && git commit -m "chore: estructura inicial de SC Art Studio desde plantilla"
```
1.4 [HUMANO] Si `gh` no está instalado o autenticado: `brew install gh` y `gh auth login` (elegir GitHub.com, HTTPS, navegador). Activar 2FA en GitHub si no está activo.
1.5 Crear el repositorio privado en GitHub y subir (copia 2):
```bash
gh repo create sc-art-studio --private --source . --remote origin --push \
  --description "SC Art Studio — tienda y contenido del arte de Scarlett"
git remote -v && git log --oneline -1 && gh repo view --web
```
1.6 Proteger la copia remota: rama `main` protegida (sin force-push ni borrado), Dependabot alerts y security updates activados, secret scanning y push protection activados:
```bash
gh api -X PUT repos/{owner}/sc-art-studio/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks= -F enforce_admins=false -f required_pull_request_reviews= -f restrictions= \
  -F allow_force_pushes=false -F allow_deletions=false
```
(Si la API rechaza la protección por el plan de la cuenta, configurarla desde GitHub → Settings → Rules y anotarlo en `CLAUDE.md`.)
1.7 Copia 3 [HUMANO]: confirmar que Time Machine (u otro respaldo automático a disco externo) incluye `~/Developer`. Las fotos y videos originales de Scarlett van además a R2 (Fase 2) y nunca solo en la Mac.
1.8 Hábito obligatorio para Claude Code: al cerrar cada tarea de Task Master → `git add -A && git commit -m "<tipo>: <tarea>" && git push`. Al cerrar cada fase → `git tag fase-N && git push --tags`. Al terminar cada sesión, verificar con `git status` que no quede nada sin subir.
1.9 [HUMANO] Comprar el dominio en Vercel (Sección 4.11): `vercel domains buy sc-artstudio.com` y, si se aprueba, `vercel domains buy scartstudio.art`. Confirmar precio en pantalla antes de aceptar.
1.10 Crear la zona en Cloudflare para el dominio. [HUMANO] En Vercel → Domains → cambiar nameservers a los dos que indique Cloudflare. Verificar con `dig NS sc-artstudio.com`.
1.11 Completar `CLAUDE.md` y `AGENTS.md` (vienen de la plantilla) con: stack, capas de seguridad (4.8), protección de la menor (4.9), convenciones de commits, y "precios y tarifas siempre configurables".
1.12 Inicializar Task Master: `task-master init`, confirmar que el PRD está en `.taskmaster/docs/prd.md`, `task-master parse-prd .taskmaster/docs/prd.md`, luego `task-master analyze-complexity --research` y `task-master expand --all --research`. Commit y push.
Checklist QA: el último commit aparece igual en `git log` local y en GitHub (mismo hash); `main` protegida; secret scanning activo; Time Machine incluye la carpeta; el dominio resuelve NS de Cloudflare; Task Master con tareas generadas.

## Fase 2 — Base de datos y backend en Railway
2.1 `railway login`, `railway init` (proyecto "sc-art-studio"), `railway add --database mysql`.
2.2 Scaffold `apps/api`: Express + TypeScript + Prisma + Zod + Helmet + CORS + rate limit + logger (pino). Script `dev`, `build`, `start`, `prisma migrate deploy` en el arranque.
2.3 Escribir `schema.prisma` con los modelos de 4.4. Primera migración. Seed con: zonas de envío, tarifas FedEx verificadas (Sección 6.4), un `PackagingProfile` de ejemplo marcado SUPUESTO, `CostSettings` iniciales (Sección 6.2) y las 4 máscaras del diseño de referencia (Jaguar Dorado, Lobo Florido, Venado Rosa, Cebra Mágica) en estado `DRAFT`.
2.4 Endpoints públicos (4.5) con tests (Vitest + Supertest).
2.5 Auth de admin: argon2id, JWT en cookie httpOnly, CSRF, bloqueo tras 5 intentos fallidos, `AuditLog`.
2.6 Desplegar en Railway (Root Directory `apps/api`). Variables: `DATABASE_URL` (referencia del servicio MySQL), `JWT_SECRET`, `SHOPIFY_*`, `R2_*`, `TURNSTILE_SECRET`, `FRONTEND_URL`.
2.7 Dominio propio del API: en Railway → Settings → Custom Domain `api.sc-artstudio.com`; crear el CNAME que Railway indique en Cloudflare con proxy **apagado** (DNS only).
2.8 Respaldo diario de MySQL (cron en Railway) a R2 o Google Drive.
Checklist QA: `GET https://api.<dominio>/health` responde 200; migraciones aplicadas; tests en verde; respaldo de prueba restaurado en una base local.

## Fase 3 — Shopify (headless)
3.1 [HUMANO] En Shopify: moneda de la tienda USD; mercados EE. UU., Canadá, México, Unión Europea y Guatemala; idioma inglés y español.
3.2 Instalar el canal "Headless" de Shopify y obtener el token público de Storefront API. Crear una app personalizada (Admin API) con permisos: productos, inventario, pedidos, draft orders, archivos. Guardar tokens solo en Railway (Admin) y Vercel (Storefront público).
3.3 Pagos: activar PayPal como proveedor (4.7). Probar un pago real de US$1 con un producto oculto y reembolsarlo.
3.4 Dominio del checkout: conectar `shop.sc-artstudio.com` a Shopify (CNAME que indique Shopify, en Cloudflare con DNS only).
3.5 Envíos en Shopify: crear perfiles por zona con las tarifas de la Sección 6.4 (o tarifas calculadas vía app si se contrata). Activar el cobro de impuestos y aranceles solo si la configuración de la tienda lo permite con el proveedor elegido; si no, usar la política "aranceles los paga el comprador" visible en la página de envíos (ver 6.5).
3.6 Producto especial "Anticipo máscara personalizada" (oculto en catálogo, precio variable mediante Draft Orders).
3.7 Webhooks: `orders/paid`, `products/update`, `inventory_levels/update` → `https://api.<dominio>/webhooks/shopify`. Verificación HMAC con tests.
3.8 Notificaciones de Shopify en inglés y español con la marca (logo, colores) y el texto "Un adulto de la familia responde los mensajes".
Checklist QA: compra de prueba completa de punta a punta; webhook marca la máscara como `SOLD`; reembolso hecho.

## Fase 4 — Frontend en Vercel
4.1 Scaffold `apps/web` (Next.js App Router + TS). Tokens de diseño de la Sección 3 en `globals.css`. Fuentes Bagel Fat One y Nunito con `next/font/google`.
4.2 i18n `en`/`es` con detección por `Accept-Language` y selector visible.
4.3 Componentes reutilizables (lista en Sección 3) con Storybook opcional.
4.4 Páginas de la tabla "Estructura de páginas" en este orden: `/`, `/mascaras`, `/mascaras/[slug]`, `/envios`, `/sobre-scarlett` (con `BookViewer` portado del prototipo), `/personalizada`, `/historias`, `/videos`, `/faq`, `/contacto`, legales.
4.5 Carrito con Storefront API y redirección a checkout.
4.6 `ShippingEstimator` en la ficha: el usuario elige país y ve opciones de envío desde `POST /api/shipping/quote`, más la nota de aranceles.
4.7 SEO: metadata, JSON-LD `Product` y `Organization`, sitemap, OG images.
4.8 [HUMANO] Si el equipo de Vercel no es Pro, activar Pro (uso comercial).
4.9 Desplegar: proyecto en Vercel con Root Directory `apps/web`. Variables: `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`, `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN`, `API_URL`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
4.10 Agregar el dominio en Vercel (apex y `www`) y crear en Cloudflare los registros exactos que muestre Vercel, con proxy **apagado** (como en MEA). Redirigir los dominios secundarios (por ejemplo `scartstudio.art`) al dominio principal con redirección 308.
Checklist QA: Lighthouse móvil ≥ 90 en rendimiento, accesibilidad y SEO en `/` y en una ficha; sin desbordes a 375 px; compra de prueba desde el dominio propio.

## Fase 5 — Panel de administración y "Subir nueva máscara"
5.1 `/admin/login` y layout protegido.
5.2 Formulario "Nueva máscara" (móvil primero): subida de fotos con URL prefirmada a R2, compresión y borrado de EXIF con `sharp` en el backend, campos editoriales es/en, medidas y peso, costo de materiales y horas.
5.3 Al escribir costo y horas, mostrar en vivo el desglose de costo y 3 precios sugeridos (márgenes 30%, 40% y 50%) y el precio con el margen objetivo de `CostSettings` (F7).
5.4 Botón "Publicar": crea el producto en Shopify con inventario 1, sube media, guarda IDs, revalida el sitio, genera la plantilla de texto para redes (es/en, hashtags, enlace con UTM).
5.5 Gestión de encargos: lista por estado, cotizar, generar link de pago del anticipo, crear Draft Order del saldo, registrar número de guía.
5.6 Gestión de historias y videos (pegar URL → se resuelve oEmbed → se guarda miniatura y título).
5.7 Pantalla "Costos y envíos": editar `CostSettings`, `ShippingRate` (con fuente y fecha) y `PackagingProfile`.
Checklist QA: Guido sube una máscara completa desde el iPhone en menos de 5 minutos y aparece en el sitio y en Shopify.

## Fase 6 — Envíos, empaque y aranceles
6.1 Cargar tarifas reales cotizadas en la Fase 0 (FedEx con cuenta, Guatex, Correos si aplica) con `source` y `validFrom`.
6.2 Implementar el cálculo de peso facturable: `max(peso real empacado, peso volumétrico)`, con el divisor configurable en `CostSettings` (confirmarlo con el transportista; la guía de FedEx GT 2026 menciona el peso dimensional pero no publica el divisor, y redondea fracciones al peso superior).
6.3 Página `/envios` con: tiempos por zona, quién paga aranceles, empaque, máscaras únicas no retornables salvo daño, y política de reembolso por daño en tránsito (fotos al recibir).
6.4 Diseñar el empaque estándar: caja doble pared, máscara envuelta en papel de seda + burbuja, esquineros, tarjeta firmada por Scarlett con QR al video de esa máscara, sticker de marca. Registrar peso y medidas en `PackagingProfile`.
6.5 Confirmar con VISAR/MAGA (tel. 1557) si las máscaras de madera pintada requieren certificado fitosanitario de exportación por destino; el costo publicado del certificado es US$6.25 más el timbre del agrónomo según valor FOB ([guía](https://livinginguatemala.com/es/tramites/maga-certificado-fitosanitario-exportacion/)). Registrar el resultado en `CLAUDE.md`.
Checklist QA: 1 envío real de prueba a EE. UU. entregado; costo real comparado con el estimado (diferencia ≤ 10%).

## Fase 7 — Contenido y redes
7.1 Integración MVP por oEmbed (YouTube, TikTok; Instagram requiere token de app de Meta).
7.2 Fase 2: cron diario en Railway que lee los últimos videos del canal de YouTube con YouTube Data API v3 y los guarda como `Video` con `source = SYNC` para que Guido solo los vincule a una máscara.
7.3 Plan editorial mínimo (7 h/semana del negocio): 1 video largo al mes en YouTube (proceso completo de una máscara), 2–3 cortos por semana reutilizados en TikTok, Reels y Shorts, 1 historia escrita al mes en el sitio. Cada video lleva enlace con UTM a la ficha de la máscara.
7.4 Historias iniciales: "Cómo empezó Scarlett" (escrita por ella, revisada por el adulto), "De bloque de madera a jaguar", "Por qué cada máscara tiene un cristal en la frente".
Checklist QA: cada máscara publicada tiene al menos 1 video vinculado; los enlaces con UTM aparecen en la analítica.

## Fase 8 — Lanzamiento
8.1 Legales: privacidad (qué datos se piden y por qué), términos, devoluciones; revisar con un adulto responsable y, si es posible, un abogado.
8.2 QA final en móvil y escritorio, inglés y español; pruebas de webhooks; respaldo verificado.
8.3 Lanzamiento con 6–8 máscaras disponibles + encargos abiertos.
8.4 Métricas semanales: visitas, conversión, ventas por país, costo de envío real vs. cobrado, utilidad por pieza.

## Fase 9 — Actualizar la plantilla para proyectos futuros
9.1 Al terminar el lanzamiento, copiar a `~/Developer/_plantillas/stack-web-mea/` todo lo que resultó reutilizable y no es propio de SC Art Studio: middlewares de seguridad, configuración de CI, scripts de respaldo, componentes base, `CLAUDE.md` genérico. Nunca copiar `.env`, datos de clientes ni contenido de Scarlett.
9.2 Anotar en `_plantillas/stack-web-mea/CHANGELOG.md` qué se agregó y de qué proyecto vino.
9.3 Commit y push de la plantilla a su propio repo privado `plantilla-stack-web-mea` (también dos copias).

# 6. Modelo de costos y precios (motor F7)

Todos los valores SUPUESTO se reemplazan con los datos reales de la Fase 0.4.

## 6.1 Fórmulas
- Costo fijo por pieza = costo fijo mensual (USD) × tipo de cambio ÷ piezas vendidas al mes.
- Costo unitario (GTQ) = materiales + (horas × tarifa por hora) + empaque + costo fijo por pieza.
- Comisiones por venta = precio × (comisión Shopify por proveedor externo + comisión de la pasarela) + cargo fijo de la pasarela.
- **Precio mínimo para un margen objetivo** (margen = utilidad ÷ precio):
  `P = (costo unitario USD + cargo fijo pasarela) ÷ (1 − % comisiones − margen)`
- **Precio de envío al cliente sin perder dinero** (las comisiones también se cobran sobre el envío):
  `Envío cobrado = costo del envío ÷ (1 − % comisiones)`

## 6.2 Parámetros iniciales (`CostSettings`)
| Parámetro | Valor | Tipo |
|---|---|---|
| Tipo de cambio | Q7.645 por US$ | Verificado: 13-oct-2026 ([Trading Economics](https://tradingeconomics.com/guatemala/currency)) |
| Comisión Shopify (proveedor externo, Basic) | 2.0% | Verificado |
| Comisión PayPal (internacional, USD) | 5.40% + US$0.30 | Verificado |
| Total % comisiones | 7.4% | 2.0 + 5.4 |
| Costo fijo mensual | US$54.94 | Sección 4.10 |
| Piezas vendidas al mes | 8 | SUPUESTO |
| Materiales por máscara | Q120 | SUPUESTO |
| Horas por máscara × tarifa | 6 h × Q25 = Q150 | SUPUESTO (pagarle a Scarlett por su trabajo es parte del costo) |
| Empaque por máscara | Q45 | SUPUESTO (cotizar caja, burbuja, tarjeta) |

## 6.3 Ejemplo calculado (con los supuestos de arriba)
1. Costo fijo por pieza: 54.94 × 7.645 = Q420.0 al mes ÷ 8 = **Q52.50**.
2. Costo unitario: 120 + 150 + 45 + 52.50 = **Q367.50** = 367.50 ÷ 7.645 = **US$48.07**.
3. Precio mínimo por margen: (48.07 + 0.30) ÷ (1 − 0.074 − margen)
   - Margen 30% → **US$77.27** · Margen 40% → **US$91.96** · Margen 50% → **US$113.55**
4. Qué queda con precios de mercado (neto = P × 0.926 − 0.30; utilidad = neto − 48.07):
| Precio | Comisiones | Neto | Utilidad | Margen | Utilidad en Q |
|---|---|---|---|---|---|
| US$95 | US$7.33 | US$87.67 | US$39.60 | 42% | Q303 |
| US$120 | US$9.18 | US$110.82 | US$62.75 | 52% | Q480 |
| US$150 | US$11.40 | US$138.60 | US$90.53 | 60% | Q692 |

**Comparación de pasarelas con el mismo costo unitario (US$48.07):**
| Precio | Opción A: PayPal (7.4% + 0.30) | Opción B: Shopify Payments, tarjeta de EE. UU. (2.9% + 0.30) | Opción B, tarjeta internacional (3.9% + 0.30) |
|---|---|---|---|
| US$95 | utilidad US$39.60 (42%) | utilidad US$43.87 (46%) | utilidad US$42.93 (45%) |
| US$120 | utilidad US$62.75 (52%) | utilidad US$68.15 (57%) | utilidad US$66.95 (56%) |
| US$150 | utilidad US$90.53 (60%) | utilidad US$97.28 (65%) | utilidad US$95.78 (64%) |
Cálculo: utilidad = precio − (precio × %) − 0.30 − 48.07. Ejemplo opción B a US$95: 95 × 0.029 = 2.755; 2.755 + 0.30 = 3.06 de comisión; 95 − 3.06 − 48.07 = 43.87. Con la opción B también baja lo que hay que cobrar de envío: zona C 2 kg = 179.60 ÷ (1 − 0.029) = US$184.96 en lugar de US$193.95. La opción B no incluye los costos de abrir y mantener una LLC si se necesita (escenario B2), que hay que cotizar.

**Precio sugerido de lanzamiento:** máscaras del catálogo **US$95–120** (dentro del rango de la competencia, Apéndice A); personalizadas **desde US$150** con anticipo del 50%. Para Guatemala: con margen 40% y suponiendo 5% de comisión de una pasarela local (SUPUESTO, falta confirmar), P = 367.50 ÷ (1 − 0.40 − 0.05) = **Q668**.

## 6.4 Envío internacional: el costo que más pesa
Tarifas oficiales FedEx Guatemala vigentes desde 5-ene-2026, en US$, sin impuestos ni recargo por combustible ([guía FedEx GT 2026](https://www.fedex.com/content/dam/fedex/international/rates/fedex-rates-all-es-gt-2026.pdf)). Zonas: C = EE. UU., México, Canadá; E = España, Alemania; F = Australia.
| Servicio | 1 kg | 1.5 kg | 2 kg | 2.5 kg | 3 kg | 5 kg |
|---|---|---|---|---|---|---|
| International Economy, zona C | 138.80 | 159.20 | 179.60 | 200.00 | 227.40 | 337.00 |
| International Economy, zona E | 183.50 | — | 241.30 | — | 299.40 | 416.20 |
| International Economy, zona F | 219.40 | — | 277.00 | — | 331.60 | 434.80 |
| International Priority, zona C | 163.00 | — | 209.00 | — | 264.30 | 393.50 |

Envío cobrado sin perder (÷ 0.926): zona C 2 kg → 179.60 ÷ 0.926 = **US$193.95**; zona E 2 kg → **US$260.58**; zona F 2 kg → **US$299.14**. FedEx indica que abrir cuenta da 20% de ahorro en Express (condiciones no detalladas): zona C 2 kg → 143.68 → cobrar **US$155.16**.

**Conclusión:** enviar una sola máscara por courier express cuesta más que la máscara. Estrategia que el sistema debe soportar:
1. **Mostrar el envío por separado y temprano** (estimador en la ficha) para que no sorprenda en el checkout.
2. **Ofrecer combos**: 2–3 máscaras en una caja aprovechan mejor el precio por kilo (5 kg zona C = US$337 vs. 3 × 1.5 kg = US$477.60).
3. **Cotizar opciones más baratas** y cargarlas como `ShippingRate` cuando estén confirmadas:
   - Guatex envía de Guatemala a EE. UU. en ~3 días hábiles, máximo 3 libras por paquete, con tarificador en línea ([Guatex](https://guatex.com/servicio-internacional/)). Una máscara de ~1.44 lb (peso de una pieza comparable) podría entrar. Tarifa: **no puedo confirmarla**, cotizar.
   - Correos de Guatemala: el servicio de pequeños paquetes a EE. UU. (hasta 2 kg, desde Q28 hasta Q220) es **solo para obsequios sin fines de venta** ([Prensa Libre](https://www.prensalibre.com/economia/correos-de-guatemala-reanuda-envio-de-pequenos-paquetes-a-estados-unidos-precios-y-requisitos/)), así que **no sirve para ventas**. Preguntar en agencia si tienen servicio comercial (encomienda) y su tarifa; su tarifario publicado no se pudo leer de forma confiable.
   - Envío consolidado: mandar lotes a una dirección en EE. UU. (familia o un centro de fulfillment) y despachar allá con correo doméstico. Costos: **no los pude verificar**; evaluar después de las primeras 10 ventas.

## 6.5 Aranceles al entrar a EE. UU.
- La exención de minimis está suspendida para todos los países ([Casa Blanca, 20-feb-2026](https://www.whitehouse.gov/presidential-actions/2026/02/continuing-the-suspension-of-duty-free-de-mi)).
- Desde el 24-jul-2026, Guatemala está entre las economías con arancel de **10%** (Sección 301) y los envíos postales menores de US$2,500 requieren aranceles prepagados ([Zonos, actualizado sept-2026](https://zonos.com/us-tariff-updates)). Ejemplo: máscara de US$95 → US$9.50 de arancel adicional, más el arancel MFN que corresponda a la partida (confirmar con el courier o un agente aduanal).
- Implementación: `usImportDutyPct` en `CostSettings`. En la ficha y en `/envios`, mostrar "Aranceles estimados de importación" por país. Política MVP: el comprador paga aranceles al recibir (DDU) con aviso claro, salvo en envíos postales donde se exige prepago; en ese caso, sumar el arancel al precio de envío.
- Estas reglas cambian seguido: el admin muestra la fecha de última revisión y un aviso si pasó más de 60 días.

# 7. Logical Dependency Chain
1. Fase 0 (cuentas y datos) → sin esto no hay dominio, pagos ni costos reales.
2. Fase 1 (dominio, DNS, repo, Task Master) → base para todo.
3. Fase 2 (base de datos y API) y Fase 3 (Shopify) pueden avanzar en paralelo una vez que exista el repo; la Fase 3 necesita la API para los webhooks (3.7).
4. Fase 4 (frontend) necesita los endpoints públicos (2.4) y el token de Storefront (3.2). Lo primero visible y usable: `/`, catálogo y ficha con compra de prueba.
5. Fase 5 (admin) necesita 2.5 (auth) y 3.2 (Admin API).
6. Fase 6 (envíos) necesita las cotizaciones de 0.5 y el modelo de 2.3; el estimador de 4.6 se conecta aquí.
7. Fase 7 (contenido) puede empezar en cuanto exista `/videos` (4.4).
8. Fase 8 (lanzamiento) al final.
Primera meta visible (2–3 semanas a 7 h/semana es optimista; planear 4): catálogo con 4 máscaras y una compra real de prueba.

# 8. Risks and Mitigations
| Riesgo | Mitigación |
|---|---|
| Envío caro que mata la venta | Estimador visible, combos, cuenta FedEx con descuento, cotizar Guatex y consolidación |
| Shopify Payments no disponible en Guatemala | PayPal en MVP; evaluar pasarela local y, a futuro, LLC en EE. UU. con asesoría |
| Cambios de aranceles en EE. UU. | Parámetro configurable + aviso de revisión cada 60 días |
| Requisitos fitosanitarios en destinos estrictos (Australia, Canadá) | Confirmar con VISAR; en Canadá, una guía de 2013 exige certificado para madera de más de 1.5 cm de grosor o con corteza ([CSCB](https://cscb.ca/en/article/import-requirements-handicrafts-decorative-and-festive-wood-items)); habilitar destinos por país solo después de confirmar |
| Exposición de una menor en internet | Reglas de la Sección 4.9 obligatorias y revisadas en cada historia y video |
| Poco tiempo (7 h/semana) | Admin de 5 minutos por máscara; contenido reutilizado en 3 redes; Task Master con tareas pequeñas |
| Saltar entre proyectos | Una fase a la vez; no abrir Fase 7 antes de vender la primera máscara |
| Costos inventados en el código | Regla: todo costo vive en la base de datos con fuente y fecha |
| Pérdida del código o del contenido | Dos copias desde el día 1 (Mac + GitHub) y tercera copia con Time Machine; fotos y videos originales en R2; push al cerrar cada tarea |
| Rechazo de Shopify Payments (opción B) | Escenario B2 confirmado: lanzar con PayPal; abrir LLC solo después de asesoría; mantener PayPal como respaldo |

# 9. Appendix

## A. Competencia analizada (precios de venta en EE. UU.)
| Tienda | Producto | Precio | Datos clave |
|---|---|---|---|
| Smithsonian Folklife Festival Marketplace | "Maya Jaguar" de José Canil Ramos, Guatemala | US$94.99 | Pino pintado a mano, 8.8 × 6 × 7 in, 1.44 lb; la ficha cuenta la historia del artesano ([link](https://festival-marketplace.si.edu/p/unique-wood-wall-art-mask-maya-jaguar/174758)) |
| National Museum of Women in the Arts shop | Jaguar tallado a mano | US$150.00 | Pino curado en horno, anilinas, crin de caballo; inspirado en danzas mayas de Guatemala ([link](https://shop.nmwa.org/products/jaguar-handcarved-wooden-mask)) |
| Powered by People | Carved Wood Jaguar Mask | US$139.00 (precio sugerido) | Mismos materiales; tiene precio mayorista para tiendas ([link](https://www.poweredbypeople.com/collections/decor/products/carved-wood-jaguar-mask)) |

Lecciones para el sitio: (1) todas cuentan quién la hizo y su historia; (2) dan medidas y materiales exactos; (3) el rango de precio de una máscara de jaguar guatemalteca está entre US$95 y US$150; (4) Powered by People muestra que existe canal mayorista (tiendas de museos), una línea a explorar en la Fase 2. Diferenciador de Scarlett: artista joven con videos del proceso y encargos personalizados, algo que estas tiendas no ofrecen.

## D. Plantilla reutilizable (carpeta aparte)
La estructura base de este proyecto quedó guardada en `~/Developer/_plantillas/stack-web-mea/` para usarla en proyectos futuros (clínicas, salones, otras tiendas). Contiene: monorepo `apps/web` + `apps/api` + `packages/shared`, `CLAUDE.md` y `AGENTS.md` genéricos con las capas de seguridad, `schema.prisma` base (`AdminUser`, `AuditLog`, `CostSettings`), middlewares de seguridad de Express, `.gitignore`, `.env.example`, flujo de CI, script de respaldo, `docs/seguridad.md` y una plantilla de PRD para Task Master. Ver su `README.md`.

## B. Pendientes que no pude confirmar
- Tarifas comerciales de Correos de Guatemala y de Guatex a EE. UU.
- Si Recurrente u otra pasarela guatemalteca tiene integración oficial con Shopify, y sus comisiones.
- Comisiones de retiro de PayPal a BAM.
- Divisor de peso volumétrico de FedEx Guatemala y recargo por combustible vigente.
- Si las máscaras de madera pintada necesitan certificado fitosanitario por destino.
- Costo real de empaque en Guatemala.
- Arancel MFN de la partida de máscaras de madera en EE. UU. y si aplica preferencia CAFTA-DR.
- Costo del agente registrado y de la dirección comercial de una LLC, y si Shopify aceptaría esa dirección para un negocio que opera desde Guatemala.
- Las capas de seguridad exactas implementadas en el repo de MEA (no lo encontré en `~/Developer`).

## C. Fuentes
- Shopify Payments, países: https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries
- Shopify precios y comisiones de Shopify Payments: https://www.shopify.com/pricing
- Shopify Payments EE. UU., requisitos: https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries/united-states/requirements
- PayPal Guatemala comisiones: https://www.paypal.com/gt/webapps/mpp/merchant-fees
- BAM + PayPal: https://newsinamerica.com/pdcc/noticias/gerenciales/2026/bam-anuncia-su-nueva-alianza-con-paypal-en-la-innovacion-de-pagos-digitales-y-retiros-a-cuentas-locales/
- Pasarelas en Guatemala: https://cartdna.com/es-mx/shopify-payment-guide/central-america/guatemala · https://www.andreybusiness.com/guatemala/shopify
- FedEx Guatemala tarifas 2026: https://www.fedex.com/content/dam/fedex/international/rates/fedex-rates-all-es-gt-2026.pdf · https://www.fedex.com/es-gt/shipping/rates.html
- Correos de Guatemala: https://www.prensalibre.com/economia/correos-de-guatemala-reanuda-envio-de-pequenos-paquetes-a-estados-unidos-precios-y-requisitos/ · https://correos.gob.gt/envios-internacionales/ · https://emisorasunidas.com/nacional/2026/01/10/correos-guatemala-envios-internacionales-paises-destino/
- Guatex: https://guatex.com/servicio-internacional/
- Aranceles EE. UU.: https://www.whitehouse.gov/presidential-actions/2026/02/continuing-the-suspension-of-duty-free-de-mi · https://zonos.com/us-tariff-updates · https://www.thompsonhinesmartrade.com/2026/02/president-trump-implements-temporary-import-duties-under-section-122-of-the-trade-act-of-1974-and-continues-the-suspension-of-duty-free-de-minimis-exception-for-international-shipments/
- Fitosanitario: https://livinginguatemala.com/es/tramites/maga-certificado-fitosanitario-exportacion/ · https://cscb.ca/en/article/import-requirements-handicrafts-decorative-and-festive-wood-items
- Vercel: https://vercel.com/pricing · https://vercel.com/docs/limits/fair-use-guidelines · precios de dominio por API de Vercel (consulta del 13-oct-2026)
- Railway: https://railway.com/pricing
- Cloudflare R2: https://developers.cloudflare.com/r2/pricing/
- Tipo de cambio: https://tradingeconomics.com/guatemala/currency
- Instagram edad mínima: https://help.instagram.com/517920941588885
- FTC y contenido infantil en YouTube: https://www.ftc.gov/business-guidance/blog/2019/11/youtube-channel-owners-your-content-directed-children

</PRD>
