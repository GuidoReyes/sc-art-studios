import { env } from "./lib/env.js";
import { createLogger } from "./lib/logger.js";
import { createApp } from "./app.js";
import { SHUTDOWN_TIMEOUT_MS } from "./config.js";

const logger = createLogger(env.LOG_LEVEL);
const app = createApp({ allowedOrigins: [env.FRONTEND_URL], logger });

const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "API escuchando"));

// Railway envía SIGTERM al redeployar: cerrar conexiones antes de salir.
let isShuttingDown = false;
function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "cerrando servidor");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
