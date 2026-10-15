import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next 16: "middleware" ahora se llama "proxy". Detecta el idioma y redirige / → /en.
export default createMiddleware(routing);

export const config = {
  // Todo excepto API, internos de Next/Vercel y archivos con extensión.
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
