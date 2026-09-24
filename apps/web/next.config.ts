import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Orígenes de la CSP (imágenes, API, Reverb, Sentry): src/lib/csp.ts, que usa src/proxy.ts (24/09/2026).
// Siguen siendo explícitos, nunca `*.dominio` (hallazgo 7 del pentest de agosto 2026).

const nextConfig: NextConfig = {
  output: "standalone",

  // No anunciar el framework: `X-Powered-By: Next.js` solo le sirve al atacante para acotar
  // qué exploits probar. El informe de TIC Defense recomienda ocultar esta información en su
  // sección "Identificación de servicios y tecnologías".
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.comecyt.gob.mx" },
      // Antes `**.edomex.gob.mx`; se alinea con IMG_ORIGINS de la CSP.
      { protocol: "https", hostname: "comecyt.edomex.gob.mx" },
      { protocol: "https", hostname: "comecyt-sistemas.edomex.gob.mx" },
      // SEGURIDAD (24/09/2026): /_next/image es público; con hosts internos permitidos servía de puente (SSRF
      // limitado) hacia el propio servidor. Solo en desarrollo.
      ...(process.env.NODE_ENV === "development"
        ? [{ protocol: "http" as const, hostname: "localhost", port: "8000" }]
        : []),
    ],
  },

  async headers() {
    return [
      // El service worker obedece la CSP con la que se sirve SU PROPIO archivo. sw.js no pasa por proxy.ts, y sin
      // esta regla recibía la de IIS (`default-src 'none'`): el SW no podía hacer fetch() y la API respondía 503
      // "Sin conexión" en todo navegador con el SW instalado (24/09/2026, corregido el mismo día).
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
          },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Observación de ADEM del 25/08/2026 (fuera de la matriz). Impide que otro origen
          // incruste como recurso las páginas y los assets de `/_next/*`. La UI carga todo
          // desde su propio origen, así que 'same-origin' no rompe nada: las imágenes externas
          // declaradas en IMG_ORIGINS entran hacia acá, que es la dirección contraria.
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // La Content-Security-Policy ya NO se define aquí (24/09/2026): la pone src/proxy.ts en cada página,
          // con un nonce por petición y sin 'unsafe-inline' en script-src (ver src/lib/csp.ts). Dejarla también
          // aquí mandaría dos políticas y el navegador aplicaría ambas. Los assets estáticos que no pasan por el
          // proxy reciben la política restrictiva de IIS (regla CspSiFalta de web.config).
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
