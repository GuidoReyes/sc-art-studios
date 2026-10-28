import type { SocialLink } from "./social";

// API vista desde el navegador (cotizador, encargos y admin). En producción, https://api.scartstudios.com.
export const BROWSER_API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

// WhatsApp del adulto responsable, en formato internacional. Se define en Vercel; nunca en el repo.
export const WHATSAPP_NUMBER: string | undefined = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || undefined;

// Cuentas de marca. Vendrán de SocialAccount (API) cuando existan; mientras, el pie no muestra redes.
export const SOCIAL_LINKS: readonly SocialLink[] = [];
