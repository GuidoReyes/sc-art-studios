import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const isDev = process.env.NODE_ENV === "development";

// Capa 4: cabeceras de seguridad. Ajustar la CSP a los servicios que use cada proyecto.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' es riesgo aceptado por ahora (páginas estáticas, sin nonces); ver docs/seguridad.md capa 4.
  // 'unsafe-eval' solo en desarrollo: lo necesita el recargado en caliente de Next.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'", // next/font sirve las fuentes desde el propio sitio
  "img-src 'self' data: blob: https://cdn.shopify.com https://*.r2.dev https://i.ytimg.com",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.tiktok.com https://www.instagram.com https://challenges.cloudflare.com",
  "connect-src 'self' https://*.myshopify.com https://api.scartstudios.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.myshopify.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/:locale(en|es)/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
