// POST /api/shipping/quote (PRD §4.5, §6.1 y §6.4): opciones de envío para un país, por
// máscara (pesada y con su caja) o por peso y medidas del paquete ya empacado.
import { Router } from "express";
import { z } from "zod";
import type { ShippingQuoteResponse } from "@sc-art-studio/shared";
import { QUOTE_MAX_SIDE_CM, QUOTE_MAX_WEIGHT_GRAMS, QUOTE_RATE_LIMIT, type RateLimitConfig } from "../config.js";
import { isCountryCode } from "../lib/countries.js";
import { type Parcel, parcelWeights, quoteRates } from "../lib/shipping.js";
import { createLimiter } from "../middleware/security.js";
import type { ShippingRepository } from "../repositories/shipping.js";

export interface ShippingDeps {
  repository: ShippingRepository;
  rateLimit?: RateLimitConfig;
  now?: () => Date;
}

const CENTS_PER_USD = 100;

const country = z.string().trim().toUpperCase().refine(isCountryCode, "código de país ISO 3166-1 alfa-2");
const sideCm = z.number().positive().max(QUOTE_MAX_SIDE_CM);

// Una u otra forma, nunca mezcladas: `.strict()` rechaza el maskId junto con medidas.
const BodySchema = z.union([
  z.object({ country, maskId: z.cuid() }).strict(),
  z
    .object({
      country,
      weightGrams: z.number().int().positive().max(QUOTE_MAX_WEIGHT_GRAMS),
      lengthCm: sideCm,
      widthCm: sideCm,
      heightCm: sideCm,
    })
    .strict(),
]);

type QuoteBody = z.infer<typeof BodySchema>;

class QuoteError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function resolveParcel(body: QuoteBody, repository: ShippingRepository): Promise<Parcel> {
  if (!("maskId" in body)) return body;
  const result = await repository.findMaskParcel(body.maskId);
  if (result.status === "not-found") throw new QuoteError(404, "No encontrado");
  if (result.status === "incomplete") {
    throw new QuoteError(422, "Esta máscara todavía no tiene peso o empaque registrado. Escríbenos para cotizar.");
  }
  return result.parcel;
}

export function createShippingRouter({
  repository,
  rateLimit = QUOTE_RATE_LIMIT,
  now = () => new Date(),
}: ShippingDeps): Router {
  const router = Router();

  router.post("/quote", createLimiter(rateLimit), async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const body = BodySchema.parse(req.body ?? {});
      const [parcel, zone, settings] = await Promise.all([
        resolveParcel(body, repository),
        repository.findZoneRates(body.country, now()),
        repository.findQuoteSettings(),
      ]);
      // Sin CostSettings no hay divisor ni comisiones: es un error de configuración, no del cliente.
      if (!settings) throw new Error("No hay CostSettings: correr el seed");

      const weightGrams = parcelWeights(parcel, settings.volumetricDivisor);
      const options = zone ? quoteRates(zone.rates, weightGrams.billable, settings.commissionBasisPoints) : [];
      const response: ShippingQuoteResponse = {
        data: {
          country: body.country,
          zone: zone?.code ?? null,
          weightGrams,
          // El costo interno no sale: el público solo ve lo que paga.
          options: options.map(({ carrier, service, chargeCents, isEstimate }) => ({
            carrier,
            service,
            chargeUsd: chargeCents / CENTS_PER_USD,
            isEstimate,
          })),
        },
      };
      res.json(response);
    } catch (error) {
      if (error instanceof QuoteError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error; // ZodError → 400, lo demás → 500 sin detalles (middleware/errors.ts)
    }
  });

  return router;
}
