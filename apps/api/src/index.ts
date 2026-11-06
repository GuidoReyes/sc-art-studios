import { env } from "./lib/env.js";
import { createLogger } from "./lib/logger.js";
import { createApp } from "./app.js";
import { createPrismaClient } from "./lib/db.js";
import { createR2Storage } from "./lib/storage.js";
import { createOEmbedResolver } from "./services/oembed.service.js";
import { createTurnstileVerifier } from "./lib/turnstile.js";
import { createPrismaCustomRequestRepository } from "./repositories/customRequests.js";
import { createPrismaMaskRepository } from "./repositories/masks.js";
import { createPrismaShippingRepository } from "./repositories/shipping.js";
import { createPrismaAdminRepository } from "./repositories/admins.js";
import { createPrismaCostSettingsRepository } from "./repositories/admin/costSettings.js";
import { createPrismaDashboardRepository } from "./repositories/admin/dashboard.js";
import { createPrismaAdminPackagingProfileStore } from "./repositories/admin/packagingProfiles.js";
import {
  createPrismaAdminShippingRateStore,
  createPrismaShippingZoneRepository,
} from "./repositories/admin/shippingRates.js";
import { createPrismaAdminMaskStore } from "./repositories/admin/masks.js";
import { createPrismaPricingRepository } from "./repositories/admin/pricing.js";
import { createPrismaAdminStoryStore } from "./repositories/admin/stories.js";
import { createPrismaAdminVideoStore } from "./repositories/admin/videos.js";
import { createTokenService } from "./lib/tokens.js";
import { createAuthService } from "./services/auth.js";
import { createPrismaStoryRepository } from "./repositories/stories.js";
import { createPrismaVideoRepository } from "./repositories/videos.js";
import { SHUTDOWN_TIMEOUT_MS } from "./config.js";

const logger = createLogger(env.LOG_LEVEL);
const prisma = createPrismaClient(env.DATABASE_URL);

// En producción env-schema exige Turnstile y R2; en desarrollo pueden faltar.
const storage =
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_PRIVATE_BUCKET
    ? createR2Storage({
        accountId: env.R2_ACCOUNT_ID,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucket: env.R2_PRIVATE_BUCKET,
      })
    : undefined;
// Tarea 41: bucket público (portadas y miniaturas). Sin él, las miniaturas quedan con la URL de la red.
const media =
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_PUBLIC_BUCKET && env.R2_PUBLIC_URL
    ? {
        storage: createR2Storage({
          accountId: env.R2_ACCOUNT_ID,
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          bucket: env.R2_PUBLIC_BUCKET,
          cacheControl: "public, max-age=31536000, immutable",
        }),
        publicUrl: env.R2_PUBLIC_URL,
      }
    : undefined;
if (!media) logger.warn("Sin R2 público: las historias no aceptan portada y las miniaturas usan la URL de la red");
const customRequests = env.TURNSTILE_SECRET
  ? {
      repository: createPrismaCustomRequestRepository(prisma),
      verifyTurnstile: createTurnstileVerifier({ secret: env.TURNSTILE_SECRET }),
      storage,
    }
  : undefined;
if (!customRequests) logger.warn("Sin TURNSTILE_SECRET: el formulario de encargos no está disponible");
if (customRequests && !storage) logger.warn("Sin R2: los encargos no aceptan foto de referencia");
const tokens = createTokenService({ accessSecret: env.JWT_SECRET, refreshSecret: env.JWT_REFRESH_SECRET });
const app = createApp({
  allowedOrigins: [env.FRONTEND_URL],
  logger,
  masks: createPrismaMaskRepository(prisma),
  stories: createPrismaStoryRepository(prisma),
  videos: createPrismaVideoRepository(prisma),
  customRequests,
  shipping: { repository: createPrismaShippingRepository(prisma) },
  auth: { service: createAuthService({ repository: createPrismaAdminRepository(prisma), tokens }), tokens },
  admin: {
    tokens,
    masks: createPrismaAdminMaskStore(prisma),
    stories: createPrismaAdminStoryStore(prisma),
    videos: createPrismaAdminVideoStore(prisma),
    pricing: createPrismaPricingRepository(prisma),
    dashboard: createPrismaDashboardRepository(prisma),
    costSettings: createPrismaCostSettingsRepository(prisma),
    shippingRates: createPrismaAdminShippingRateStore(prisma),
    shippingZones: createPrismaShippingZoneRepository(prisma),
    packagingProfiles: createPrismaAdminPackagingProfileStore(prisma),
    oembed: createOEmbedResolver({ media, instagramToken: env.INSTAGRAM_OEMBED_TOKEN }),
    media,
  },
});

const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "API escuchando"));

// Railway envía SIGTERM al redeployar: cerrar conexiones antes de salir.
let isShuttingDown = false;
function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "cerrando servidor");
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
