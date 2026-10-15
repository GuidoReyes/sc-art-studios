import express from "express";
import { env } from "./lib/env.js";
import { applySecurity } from "./middleware/security.js";
import { errorHandler, logger } from "./middleware/errors.js";

const app = express();

// Los webhooks necesitan el body crudo para verificar HMAC: registrar sus rutas ANTES de express.json().
// app.post("/webhooks/shopify", express.raw({ type: "application/json" }), shopifyWebhook);

applySecurity(app);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
// app.use("/api", publicRoutes);
// app.use("/api/admin", adminRoutes);

app.use(errorHandler);
app.listen(env.PORT, () => logger.info(`API escuchando en :${env.PORT}`));
