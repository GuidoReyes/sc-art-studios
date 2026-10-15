// Capa 4: cabeceras de seguridad. Ajustar la CSP a los servicios que use cada proyecto.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://cdn.shopify.com https://*.r2.dev https://i.ytimg.com",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.tiktok.com https://www.instagram.com https://challenges.cloudflare.com",
  "connect-src 'self' https://*.myshopify.com https://api.sc-artstudio.com",
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
export default {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};
