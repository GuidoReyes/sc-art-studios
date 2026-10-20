---
type: session
area: negocio
date: 2026-10-18
slug: guia-contadores-llc-y-stripe
title: "Guía para las citas con contadores (LLC) y descarte de Stripe"
tags: [pagos, llc, contador, stripe, shopify-payments, paypal]
status: active
related:
  - 2026-10-18-prisma-7-schema-y-migracion-inicial
  - 2026-10-14-repo-publico-monorepo-y-dominio
sources:
  - repo:.taskmaster/docs/prd.md
  - url:https://stripe.com/global
  - url:https://stripe.com/pricing
  - url:https://stripe.com/atlas
superseded_by: null
---

# Guía para las citas con contadores (LLC) y descarte de Stripe

## Contexto
Tarea 36.2 [HUMANO]: citas con un contador de EE. UU. y otro de Guatemala para decidir la LLC del escenario B2 (PRD §4.7). Claude preparó el material. Las citas y la decisión las hace la familia. A mitad de la sesión se pidió analizar Stripe como pasarela.

## Decisiones
- El material para las citas vive en un doc privado de Claude Docs, **fuera del repo**, porque tiene datos fiscales y familiares. El link lo tiene Guido. Cuando haya decisión, solo la estructura elegida se anota en `CLAUDE.md`.
- **Stripe se descarta como pasarela (verificado el 18-oct-2026):**
  - Guatemala no está en los países de Stripe; en Latinoamérica solo aparecen Brasil y México.
  - Con una LLC en EE. UU., Shopify no permite elegir Stripe porque Shopify Payments ya funciona sobre Stripe. Esto viene de la comunidad de Shopify y guías de terceros: confirmarlo en el admin.
  - Stripe fuera de Shopify cobra +1.5 % con tarjetas internacionales, contra +1 % de Shopify Payments, y obligaría a programar un checkout propio.
- **Stripe Atlas queda como opción para abrir la LLC:** US$500 el primer año y US$100 al año después, solo en Delaware. Se compara con abrirla uno mismo en Wyoming en la cita con el contador de EE. UU.
- Se mantiene lo que dice el PRD: lanzar con PayPal (opción A).

## Output
- Doc privado con cinco partes: resumen del negocio, 15 preguntas para el contador de EE. UU., 12 para el de Guatemala, una tabla de costos con la fórmula del punto de equilibrio (costo anual ÷ US$4.27 por máscara de US$95) y una plantilla para la decisión. También una sección con el análisis de Stripe.
- La tarea 36.2 quedó en `in-progress`.

## Pendiente
- [HUMANO] Confirmar el estatus fiscal en EE. UU. de la adulta responsable antes de las citas: cambia todo el análisis.
- [HUMANO] Agendar las dos citas, idealmente en la misma semana.
- Cuando haya decisión: anotarla en `CLAUDE.md`, ajustar `CostSettings` si cambia la pasarela y cerrar la 36.2.

## Cross-refs
- [[2026-10-18-prisma-7-schema-y-migracion-inicial]] — misma sesión; `CostSettings` guarda las comisiones de la pasarela que se elija.
- [[2026-10-14-repo-publico-monorepo-y-dominio]] — tarea 36.1 (dominio), la decisión hermana de Fase 0; el repo público obliga a dejar fuera los datos fiscales.
- [[2026-10-19-seed-tarifas-fedex-y-costos]] — el seed guarda PayPal (5.40 %) y Shopify (2.00 %) por separado; otra pasarela es otra fila de CostSettings.

## Fuentes
- [[sources#prd]]
- [Stripe Global](https://stripe.com/global)
- [Stripe Pricing](https://stripe.com/pricing)
- [Stripe Atlas](https://stripe.com/atlas)
- [Comunidad Shopify: Shopify Payments y Stripe](https://community.shopify.com/t/shopify-payments-and-stripe/384164)
