import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Desde el 11/09/2026 NEXT_PUBLIC_API_URL es relativa ("/api"): UI y API comparten origen y
// 'self' ya la cubre. Solo una URL absoluta (API en otro host) agrega su origen a la CSP.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
})();

// Hallazgo 7 del pentest de agosto 2026: la CSP permitía dominios con comodín
// (`https://*.edomex.gob.mx`, `https://*.sentry.io`). Un solo subdominio comprometido
// o registrado por un tercero bastaba para saltarse la política. A partir de aquí cada
// origen externo se declara explícitamente; para habilitar uno nuevo se agrega a esta
// lista — nunca con `*.`.
const IMG_ORIGINS = [
  "https://picsum.photos",
  "https://images.comecyt.gob.mx",
  "https://comecyt.edomex.gob.mx",
  "https://comecyt-sistemas.edomex.gob.mx",
  "https://sidecyt-comecyt.edomex.gob.mx",
];

// El origen de Sentry se deriva del DSN configurado, en vez de abrir `*.sentry.io`.
// Hoy el DSN viene vacío, así que la directiva no incluye ningún host de Sentry.
const SENTRY_ORIGIN = (() => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return "";
  try {
    return new URL(dsn).origin;
  } catch {
    return "";
  }
})();

// WebSocket (Reverb) — orígenes explícitos en lugar de los esquemas abiertos `ws: wss:`.
// Sin NEXT_PUBLIC_REVERB_HOST el cliente se conecta al origen de la página (echo.ts), que ya
// cubre 'self'; solo un host explícito se declara aparte.
const REVERB_HOST = process.env.NEXT_PUBLIC_REVERB_HOST;
const REVERB_PORT = process.env.NEXT_PUBLIC_REVERB_PORT || "8080";
const WS_ORIGINS = REVERB_HOST
  ? [
      `ws://${REVERB_HOST}:${REVERB_PORT}`,
      `wss://${REVERB_HOST}:${REVERB_PORT}`,
      `wss://${REVERB_HOST}`,
    ]
  : [];

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
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "10.250.36.241" },
      { protocol: "https", hostname: "10.250.36.241" },
    ],
  },

  async headers() {
    return [
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
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; ` +
              `script-src 'self' 'unsafe-inline'; ` +
              `style-src 'self' 'unsafe-inline'; ` +
              `font-src 'self' data:; ` +
              `img-src ${["'self'", "data:", "blob:", API_ORIGIN, ...IMG_ORIGINS].filter(Boolean).join(" ")}; ` +
              `connect-src ${["'self'", API_ORIGIN, ...WS_ORIGINS, SENTRY_ORIGIN].filter(Boolean).join(" ")}; ` +
              `frame-ancestors 'none'; ` +
              `base-uri 'self'; ` +
              `form-action 'self'; ` +
              `object-src 'none'`,
          },
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
