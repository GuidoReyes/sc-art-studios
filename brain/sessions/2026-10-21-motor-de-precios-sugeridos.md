---
type: session
area: backend
date: 2026-10-21
slug: motor-de-precios-sugeridos
title: "Motor de costos y precio sugerido del admin con márgenes de CostSettings"
tags: [api, admin, precios, costos, decimal, costsettings]
status: active
related:
  - 2026-10-20-crud-admin-auditado
  - 2026-10-20-cotizador-de-envio-sin-perdida
  - 2026-10-19-seed-tarifas-fedex-y-costos
sources:
  - repo:apps/api/src/lib/pricing.ts
  - repo:apps/api/src/routes/admin/pricing.ts
  - repo:apps/api/src/repositories/admin/pricing.ts
  - repo:packages/shared/src/admin.ts
superseded_by: null
---

# Motor de costos y precio sugerido del admin con márgenes de CostSettings

## Contexto
Tarea 15 de Task Master (F7): `POST /api/admin/pricing/suggest` calcula el costo unitario de una máscara y el precio de venta mínimo por margen con las fórmulas del PRD §6.1–6.3. Lo usará el panel al cargar una máscara, antes de fijar `priceUsd` en el CRUD de [[2026-10-20-crud-admin-auditado]].

## Decisiones
- **Entrada:** `materialsCostGtq`, `laborHours` (mismos topes y decimales que las columnas de `Mask`) y `packagingProfileId`. Zod estricto: no se puede mandar un margen o una comisión a mano. Caja inexistente → 422 `INVALID_REFERENCE`.
- **Todo número de negocio sale de la DB:** tipo de cambio, comisiones (pasarela + Shopify), cargo fijo, costo fijo mensual, piezas al mes, tarifa por hora y margen objetivo vienen de la `CostSettings` vigente (id más alto, como el cotizador). El costo de la caja, de `PackagingProfile.costGtq`.
- **Márgenes sugeridos:** la tarea pedía 30/40/50 fijos; se arman como objetivo − 10, objetivo y objetivo + 10 (con el seed dan 30/40/50) para no fijar márgenes en el código. Los 10 puntos son solo la forma de comparar. Los que no se pueden alcanzar con las comisiones se omiten; si el objetivo mismo no se alcanza, 422 `MARGIN_UNREACHABLE`.
- **Precisión:** cálculo con `Prisma.Decimal` sin redondeos intermedios. El precio se redondea **hacia arriba** al centavo (igual que el cobro de envío) para que el margen real nunca quede por debajo del pedido; el desglose se muestra a 2 decimales. Da exactamente el ejemplo del PRD: Q367.50 = US$48.07 → 77.27 / 91.96 / 113.55.
- **Respuesta:** `{data: {costBreakdown, suggestedPrices, targetPrice, settings}}`. Cada opción trae `priceUsd`, `feesUsd`, `profitUsd` y `profitGtq`; `settings` muestra los parámetros usados y su `updatedAt` para que el admin vea de dónde sale el número. Nombres con moneda (`materialsGtq`…) en vez de `materials` como decía la tarea.
- **Sin AuditLog:** solo calcula, no cambia nada. Va bajo el mismo `/api/admin` (sesión, CSRF, 30/min por usuario, `no-store`).
- Sin `CostSettings` (seed sin correr) → 500 genérico, como el cotizador.

## Output
- Commit `0ebe8f1`.
- Verificado: 389 pruebas de la API (98.4 % de líneas), typecheck, lint y build. En vivo contra el MySQL local con un EDITOR de prueba: el ejemplo del PRD da los valores esperados; sin CSRF 403, sin sesión 401, caja inexistente 422, campo extra 400; con decimales (95.5 y 4.25 h) también cuadra. Solo quedó `auth.login` en AuditLog. El admin de prueba y sus filas se borraron.

## Pendiente
- El panel (fase 5) debe mostrar el desglose, las tres opciones y la fecha de `settings.updatedAt`, y dejar copiar el precio elegido a la máscara.
- Precio en quetzales para Guatemala (PRD §6.3 usa 5 % de una pasarela local, SUPUESTO): no se calcula hasta confirmar la pasarela.
- Si el panel necesita "qué queda a un precio dado" (tabla del paso 4 del PRD), sumar un `priceUsd` opcional a la entrada.

## Cross-refs
- [[2026-10-20-crud-admin-auditado]] — vive bajo el mismo `/api/admin` y su `requireAdmin`; el precio elegido se guarda con ese CRUD.
- [[2026-10-20-cotizador-de-envio-sin-perdida]] — misma CostSettings vigente y mismo criterio de redondear hacia arriba para no perder.
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — los valores de CostSettings y la caja supuesta con que se verificó el ejemplo del PRD.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
