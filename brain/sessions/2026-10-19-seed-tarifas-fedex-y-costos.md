---
type: session
area: backend
date: 2026-10-19
slug: seed-tarifas-fedex-y-costos
title: "Seed idempotente con tarifas FedEx, costos iniciales y 4 máscaras"
tags: [prisma, seed, costos, envios, fedex, mascaras]
status: active
related:
  - 2026-10-18-prisma-7-schema-y-migracion-inicial
  - 2026-10-15-railway-mysql-y-db-local
  - 2026-10-18-guia-contadores-llc-y-stripe
  - 2026-10-19-componentes-base-del-diseno
sources:
  - repo:apps/api/src/seed/
  - repo:apps/api/prisma.config.ts
  - url:https://www.fedex.com/content/dam/fedex/international/rates/fedex-rates-all-es-gt-2026.pdf
superseded_by: null
---

# Seed idempotente con tarifas FedEx, costos iniciales y 4 máscaras

## Contexto
Tarea 8 de Task Master (PRD 2.3): cargar los datos iniciales que el PRD marca como verificados o SUPUESTO, para que precios, tarifas y comisiones vivan en la base y no en el código. Antes, en la misma sesión, se subieron los commits de la tarea 26.

## Decisiones
- **Ubicación:** el seed vive en `apps/api/src/seed/` y no en `prisma/seed.ts` como decía la tarea. `tsconfig` solo revisa `src/`, así tiene tipos, pruebas, cobertura y build. `prisma.config.ts` lo ejecuta con `tsx` (`npm run prisma:seed`). En Railway, sin `tsx`, se corre `node dist/seed/index.js`.
- **Comisiones separadas:** la tarea decía `gatewayPct=7.4`, pero ese 7.4 es la suma de PayPal (5.40) y Shopify (2.00). Como el schema guarda las dos por separado, se usó 5.40 para no cobrar dos veces la comisión de Shopify.
- **Solo crea, nunca actualiza:** cada tabla se busca por su clave (código de zona; zona + servicio + peso + vigencia; nombre del empaque; slug) y solo se inserta lo que falta. `CostSettings` es versionada, así que solo se carga si la tabla está vacía. Lo editado en el admin no se pisa y el seed se puede repetir sin riesgo, incluso en producción.
- **Datos:** 3 zonas FedEx (C = US/MX/CA, E = ES/DE, F = AU) y las 18 tarifas de la tabla §6.4, con vigencia desde el 5-ene-2026 y la URL de la guía como fuente. Las tarifas quedan como estimadas porque no incluyen recargo por combustible ni impuestos.
- **Empaque:** se llama "Estándar (supuesto)" para que en el admin se vea que falta cotizarlo; el schema no tiene campo de notas.
- **Máscaras:** Jaguar Dorado, Lobo Florido, Venado Rosa y Cebra Mágica en `DRAFT`, sin precio ni IDs de Shopify, con descripciones marcadas como provisionales.
- `updatedById` de `CostSettings` queda nulo: lo cargó el seed, no un admin.

## Output
- Commit `79cb910`: `src/seed/{data,seed,index}.ts` con 14 pruebas (datos contra el PRD, idempotencia y que no pise ediciones) usando un cliente falso en memoria.
- Verificado en el MySQL local: 3 zonas, 18 tarifas, 1 empaque, 1 `CostSettings`, 4 máscaras DRAFT. Columnas `DECIMAL`/`DATETIME(3)`, acentos en UTF-8 y una segunda y tercera corrida sin crear nada. El build compilado también corre.
- API: 57 pruebas, typecheck, lint y `npm audit --omit=dev` en 0.

## Pendiente
- Correr el seed en Railway cuando se despliegue la API (tarea 22).
- Reemplazar los SUPUESTO (piezas al mes, tarifa por hora, empaque) con datos reales desde el admin.
- Cargar tarifas de Guatex u otras opciones baratas cuando estén cotizadas.

## Cross-refs
- [[2026-10-18-prisma-7-schema-y-migracion-inicial]] — el schema y la migración que este seed llena.
- [[2026-10-15-railway-mysql-y-db-local]] — el MySQL local en Docker donde se verificó; el de Railway lo recibirá.
- [[2026-10-18-guia-contadores-llc-y-stripe]] — si cambia la pasarela, cambia `gatewayPct` en una fila nueva de `CostSettings`, no el seed.
- [[2026-10-19-componentes-base-del-diseno]] — `PriceTag` recibirá el tipo de cambio que aquí se carga (7.645).
- [[2026-10-19-endpoints-publicos-de-mascaras]] — los endpoints públicos ocultan las máscaras DRAFT que carga este seed.
- [[2026-10-20-cotizador-de-envio-sin-perdida]] — el cotizador de envío usa sus zonas, tarifas, empaque supuesto y CostSettings.
- [[2026-10-21-motor-de-precios-sugeridos]] — calcula costo y precio con la CostSettings y la caja de este seed.

## Fuentes
- [[sources#prd]]
- [[sources#tasks]]
- [Guía FedEx GT 2026](https://www.fedex.com/content/dam/fedex/international/rates/fedex-rates-all-es-gt-2026.pdf)
