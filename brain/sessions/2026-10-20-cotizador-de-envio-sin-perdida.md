---
type: session
area: backend
date: 2026-10-20
slug: cotizador-de-envio-sin-perdida
title: "Cotizador de envío con peso volumétrico y cobro que cubre comisiones"
tags: [api, envios, fedex, costos, zod, rate-limit]
status: active
related:
  - 2026-10-19-seed-tarifas-fedex-y-costos
  - 2026-10-19-formulario-de-encargos-con-foto-segura
  - 2026-10-19-endpoints-publicos-de-mascaras
sources:
  - repo:apps/api/src/routes/shipping.ts
  - repo:apps/api/src/lib/shipping.ts
  - repo:apps/api/src/repositories/shipping.ts
  - repo:packages/shared/src/shipping.ts
superseded_by: null
---

# Cotizador de envío con peso volumétrico y cobro que cubre comisiones

## Contexto
Tarea 12 de Task Master (PRD §4.5, §6.1 y §6.4): `POST /api/shipping/quote`, que alimentará el ShippingEstimator de la ficha (tarea de frontend) y el admin.

## Decisiones
- **Dos formas de pedir, nunca mezcladas:** `{country, maskId}` o `{country, weightGrams, lengthCm, widthCm, heightCm}` (Zod estricto en unión). Las medidas a mano son del paquete ya empacado; con `maskId` se suma el peso de la caja del `PackagingProfile` y se usan sus medidas **exteriores**.
- **Peso facturable** = max(real empacado, volumétrico), con el divisor de `CostSettings`. Todo en enteros (gramos, décimas de cm, centavos, puntos básicos) para evitar errores de punto flotante; el volumétrico se redondea hacia arriba.
- **Tarifa:** por cada transportista y servicio, el tramo más ajustado con `maxWeightKg ≥ peso facturable`, solo tarifas vigentes (`validFrom`/`validTo`). Si el paquete pasa del tramo más alto, ese servicio no sale.
- **Cobro sin pérdida:** `costo ÷ (1 − (gatewayPct + shopifyThirdPartyPct))`, como el PRD §6.1 (7.4 %), no solo `gatewayPct` como decía la tarea. Redondeo hacia arriba al centavo (179.60 → 193.96; el PRD redondeaba a 193.95). El cargo fijo de la pasarela no se suma al envío: se cobra una vez por pedido y ya está en el precio de la máscara.
- **El costo interno no sale** en la respuesta pública (solo `chargeUsd`), igual que los costos de la máscara en [[2026-10-19-endpoints-publicos-de-mascaras]]. El admin tendrá su propia vista.
- **Sin `deliveryDays`:** el modelo `ShippingRate` no tiene esa columna; no se inventa en el código.
- **Respuestas:** país sin zona → 200 con `zone: null` y `options: []` (la web ofrece escribir); máscara borrador o inexistente → 404; máscara pública sin peso o sin empaque → 422; sin `CostSettings` → 500 (error de configuración). `Cache-Control: no-store`.
- **Rate limit** propio de 20 por minuto (`QUOTE_RATE_LIMIT`), además del general. Topes de entrada: 68 kg y 274 cm por lado (bulto de courier).
- `isCountryCode` se movió a `lib/countries.ts` para compartirla con el formulario de encargos.

## Output
- Commit `0522609`.
- Verificado: 213 pruebas de la API (98 % de cobertura), typecheck, lint y build. Con la API compilada contra el MySQL local y las tarifas del seed: US 1.8 kg → Economy 193.96 / Priority 225.71; ES con la caja supuesta → 323.33; GT sin zona → vacío; 6 kg a AU → sin opciones; el Jaguar en borrador → 404, público sin peso → 422 y completo → 245.58 / 285.43; la petición 21 del minuto → 429. Los logs no traen el cuerpo. El Jaguar se dejó como estaba (DRAFT, sin peso ni caja).

## Pendiente
- **La caja manda el precio:** con la caja supuesta de 30×25×20 cm el peso volumétrico es 3 kg aunque la máscara empacada pese 850 g, y el envío a EE. UU. pasa de ~US$150 (1 kg) a US$245.58. Al diseñar el empaque real (PRD 6.4) conviene la caja más chica que proteja bien; y confirmar el divisor de FedEx GT (5000 es supuesto).
- Mostrar "Aranceles estimados" (`usImportDutyPct`) junto al estimador en la web (PRD §6.5).
- Tiempos de entrega por servicio si se quieren mostrar: agregar columna a `ShippingRate` desde el admin.

## Cross-refs
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — usa sus zonas, tarifas, empaque supuesto y `CostSettings`.
- [[2026-10-19-formulario-de-encargos-con-foto-segura]] — comparte `lib/countries.ts` (validación ISO 3166-1).
- [[2026-10-19-endpoints-publicos-de-mascaras]] — mismo criterio: borradores no existen para el público y los costos no salen.
- [[2026-10-20-login-admin-refresh-rotativo-csrf]] — misma sesión; después del cotizador vino el login del admin.
- [[2026-10-21-motor-de-precios-sugeridos]] — usa la misma CostSettings vigente y el mismo redondeo hacia arriba para no perder.
- [[2026-10-26-sitio-publico-catalogo-envios-y-libro]] — el estimador de la ficha llama a este cotizador desde el navegador.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
