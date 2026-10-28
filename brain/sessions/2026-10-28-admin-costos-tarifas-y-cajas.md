---
type: session
area: frontend
date: 2026-10-28
slug: admin-costos-tarifas-y-cajas
title: "Admin: costos versionados, tarifas de envío y cajas con aviso de arancel"
tags: [frontend, backend, admin, costos, envios, auditoria, precios]
status: active
related:
  - 2026-10-27-panel-admin-login-y-resumen
  - 2026-10-20-crud-admin-auditado
  - 2026-10-21-motor-de-precios-sugeridos
  - 2026-10-19-seed-tarifas-fedex-y-costos
  - 2026-10-20-cotizador-de-envio-sin-perdida
superseded_by: null
sources:
  - repo:apps/api/src/routes/admin/costs.ts
  - repo:apps/api/src/repositories/admin/costSettings.ts
  - repo:apps/api/src/repositories/admin/shippingRates.ts
  - repo:apps/api/src/repositories/admin/packagingProfiles.ts
  - repo:apps/api/prisma/migrations/20261028153636_cost_settings_duty_review
  - repo:apps/web/components/admin/costs
---

# Admin: costos versionados, tarifas de envío y cajas con aviso de arancel

## Contexto
Tarea 42 (fase 5), segunda pantalla del panel de [[2026-10-27-panel-admin-login-y-resumen]]. El usuario pidió seguir con el admin en local; no toca Shopify. Edita lo que cargó el seed de [[2026-10-19-seed-tarifas-fedex-y-costos]] y que usan el motor de precios y el cotizador.

## Decisiones
- **CostSettings versionada**: `PUT /api/admin/cost-settings` inserta una fila nueva (la vigente sigue siendo la de id más alto) y su AuditLog en una transacción **serializable**. El cliente manda `baseVersionId`; si otra persona guardó antes → 409 `STALE` (también si MySQL cancela por choque, P2034). Guardar sin cambios → 422 `NO_CHANGES`.
- **Columna nueva `usImportDutyReviewedAt`** (migración aditiva; las filas viejas toman su `updatedAt`): `updatedAt` cambia con cualquier campo, así que no servía para "el arancel no se revisa en 60 días". Se renueva al cambiar el arancel o al marcar "Revisé el arancel hoy". `DUTY_REVIEW_DAYS = 60` en `config.ts` (es un plazo de revisión, no un dato de negocio).
- Validación igual a la del motor: comisiones + margen objetivo < 100 %, tipo de cambio > 0, enteros ≥ 1.
- **Tarifas y cajas** reusan el CRUD auditado de [[2026-10-20-crud-admin-auditado]] (`EntityOps` ahora acepta `ShippingRate` y `PackagingProfile`). Una tarifa no puede terminar antes de empezar (también al editar una sola fecha). Una caja que usan máscaras no se borra (409 `IN_USE`; el `deleteMany` exige `masks: none` por si se la asignan mientras se borra). Para cambiar un precio de tarifa se recomienda cerrar la vigencia y crear otra, así queda historial.
- `adminRequest` ahora devuelve `code` y los campos inválidos de la API; los formularios traducen los códigos (nunca muestran el texto crudo). Un 429 tiene su propio mensaje: el límite de 30/min por usuario se alcanza rápido en desarrollo porque React corre dos veces los efectos.
- Se extrajeron `styles.ts` y `useAdminData` (el resumen también los usa).
- Bug encontrado en el E2E: `«cotización <fecha>»` en un mensaje rompía ICU (`UNCLOSED_TAG`). Prueba nueva en `i18n/messages.test.ts` que valida todos los mensajes con `createTranslator`; se comprobó que falla con el texto viejo.

## Output
- Commit `a122447`.
- Verificado: 430 pruebas de la API y 114 de la web, typecheck y lint. E2E en Chromium: bajar la comisión de la pasarela bajó al instante el precio sugerido de una pieza de prueba y volvió al restaurarla; margen imposible, sin cambios y STALE entre dos pestañas con su mensaje; tarifa nueva, periodo inválido, edición y borrado; caja con medidas inválidas, alta y borrado; aviso de arancel vencido (fecha retrocedida solo en la DB local) que desaparece al confirmar. Cada cambio quedó en AuditLog con antes/después. axe sin violaciones en escritorio y móvil, sin desborde.

## Pendiente
- Tareas 34 (máscaras), 40 (encargos) y 41 (historias y videos) sobre el panel.
- Las zonas de envío no se editan desde el admin (solo se eligen); si hace falta una zona nueva, es una tarea aparte.
- La caja "Estándar (supuesto)" y las tarifas siguen siendo valores iniciales: el usuario puede corregirlos desde esta pantalla.

## Cross-refs
- [[2026-10-27-panel-admin-login-y-resumen]] — usa su sesión, CSRF y barra lateral; ahora comparte `useAdminData` y `styles.ts`.
- [[2026-10-20-crud-admin-auditado]] — tarifas y cajas reusan su store auditado; CostSettings audita igual pero versionando.
- [[2026-10-21-motor-de-precios-sugeridos]] — el precio sugerido lee la versión vigente, así que un cambio se ve de inmediato; misma regla de margen alcanzable.
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — los valores que se editan aquí son los que cargó el seed.
- [[2026-10-20-cotizador-de-envio-sin-perdida]] — el cotizador usa las tarifas vigentes, el divisor volumétrico y las medidas exteriores de la caja que se editan aquí.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
