/**
 * Content-Security-Policy con nonce por petición (SEGURIDAD, 24/09/2026).
 *
 * Antes: `script-src 'self' 'unsafe-inline'` (next.config.ts). Con eso, cualquier XSS que lograra inyectar un
 * <script> en línea se ejecutaba. Ahora `proxy.ts` genera un nonce aleatorio por petición y solo corren los scripts
 * que lo llevan: los de Next.js (los etiqueta solo, leyendo el nonce de la cabecera CSP de la petición) y el script
 * de recuperación de `app/layout.tsx` (lo lee de `x-nonce`). `'strict-dynamic'` deja que esos scripts carguen sus
 * chunks; `'self'` queda como respaldo para navegadores sin CSP 3.
 *
 * `style-src` conserva `'unsafe-inline'`: React (`style={...}`) y Framer Motion escriben estilos en línea. El riesgo
 * de un estilo inyectado es mucho menor que el de un script; quitarlo es otro proyecto.
 *
 * Orígenes externos: explícitos, nunca `*.dominio` (hallazgo 7 del pentest de agosto 2026).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
function origen(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).origin;
  } catch {
    return ''; // relativa ("/api"): 'self' ya la cubre
  }
}

const IMG_ORIGINS = [
  'https://picsum.photos',
  'https://images.comecyt.gob.mx',
  'https://comecyt.edomex.gob.mx',
  'https://comecyt-sistemas.edomex.gob.mx',
  'https://sidecyt-comecyt.edomex.gob.mx',
];

const REVERB_HOST = process.env.NEXT_PUBLIC_REVERB_HOST;
const REVERB_PORT = process.env.NEXT_PUBLIC_REVERB_PORT || '8080';
const WS_ORIGINS = REVERB_HOST
  ? [`ws://${REVERB_HOST}:${REVERB_PORT}`, `wss://${REVERB_HOST}:${REVERB_PORT}`, `wss://${REVERB_HOST}`]
  : [];

export function generarNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function construirCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === 'development';
  const api = origen(API_URL);
  const sentry = origen(process.env.NEXT_PUBLIC_SENTRY_DSN);
  return [
    `default-src 'self'`,
    // 'unsafe-eval' solo en desarrollo (React lo usa para depurar); nunca en producción.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self' data:`,
    `img-src ${["'self'", 'data:', 'blob:', api, ...IMG_ORIGINS].filter(Boolean).join(' ')}`,
    `connect-src ${["'self'", api, ...WS_ORIGINS, sentry].filter(Boolean).join(' ')}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `frame-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    dev ? '' : 'upgrade-insecure-requests',
  ].filter(Boolean).join('; ');
}
