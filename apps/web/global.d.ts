import type messages from "./messages/en.json";
import type { routing } from "./i18n/routing";

// Claves de traducción tipadas: t("clave-inexistente") es error de TypeScript.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
