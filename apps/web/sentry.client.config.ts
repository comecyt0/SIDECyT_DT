import * as Sentry from '@sentry/nextjs';

// SEV-2 — Sentry envía datos a servicio externo. LFPDPPP exige minimización de PII
// y consentimiento para transferencia internacional. `beforeSend` redacta PII antes
// de salir del navegador.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const env = process.env.NODE_ENV;

if (dsn && env !== 'production' && typeof window !== 'undefined') {
  console.warn(
    `[Sentry] DSN activo en entorno "${env}". Los errores de este navegador se enviarán a Sentry. ` +
    `Para desactivar en dev, elimina NEXT_PUBLIC_SENTRY_DSN de .env.local.`,
  );
}

// Patrones de PII a redactar (allowlist sería ideal, pero como evento es libre, denylist agresivo)
const PII_KEY_PATTERNS = /^(password|pwd|pass|token|secret|jwt|authorization|cookie|otp|totp|recovery|backup_code|rfc|curp|clabe|cuenta|tarjeta|cvv|email|correo|telefono|phone)$/i;
// Cuantificadores acotados {n,m} para evitar catastrophic backtracking (ReDoS).
// eslint-disable-next-line security/detect-unsafe-regex -- bounded by {1,64}/{1,32}/{1,8}; input es Sentry event string capped por el SDK; revisado 2026-06-10
const EMAIL_RE = /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,64}(?:\.[A-Za-z0-9-]{1,32}){1,8}\b/g;
// eslint-disable-next-line security/detect-unsafe-regex -- bounded {3,4}+{6}+{3}; RFC mexicano formal; revisado 2026-06-10
const RFC_RE = /\b[A-ZÑ&]{3,4}\d{6}(?:[A-Z\d]{3})?\b/g; // RFC MX
const CURP_RE = /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/g;
const CLABE_RE = /\b\d{18}\b/g;
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._-]+/gi;

function redactString(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  return input
    .replace(JWT_RE, '[REDACTED_JWT]')
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(RFC_RE, '[REDACTED_RFC]')
    .replace(CURP_RE, '[REDACTED_CURP]')
    .replace(CLABE_RE, '[REDACTED_CLABE]');
}

function scrubObject<T>(obj: T, depth = 0): T {
  if (depth > 6 || obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => scrubObject(v, depth + 1)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (PII_KEY_PATTERNS.test(k)) {
        out[k] = '[REDACTED]';
      } else if (typeof v === 'string') {
        out[k] = redactString(v);
      } else if (typeof v === 'object' && v !== null) {
        out[k] = scrubObject(v, depth + 1);
      } else {
        out[k] = v;
      }
    }
    return out as unknown as T;
  }
  if (typeof obj === 'string') {
    return redactString(obj) as unknown as T;
  }
  return obj;
}

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE) || 0.1,
  environment: env,
  debug: false,
  // SEV-2 — LFPDPPP: jamás capturar identidad del usuario en Sentry.
  sendDefaultPii: false,
  // Saneamiento defensivo de breadcrumbs (clicks, navegación con query strings con PII).
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data) breadcrumb.data = scrubObject(breadcrumb.data);
    if (breadcrumb.message) breadcrumb.message = redactString(breadcrumb.message) as string;
    return breadcrumb;
  },
  // Saneamiento final del evento — última línea antes de salir del navegador.
  beforeSend(event) {
    // User: nunca mandar email/IP/username.
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    // Request: redactar URL, headers, query, body.
    if (event.request) {
      if (event.request.url) event.request.url = redactString(event.request.url) as string;
      if (event.request.query_string) {
        event.request.query_string =
          typeof event.request.query_string === 'string'
            ? (redactString(event.request.query_string) as string)
            : event.request.query_string;
      }
      if (event.request.headers) event.request.headers = scrubObject(event.request.headers);
      if (event.request.cookies) event.request.cookies = scrubObject(event.request.cookies);
      if (event.request.data) event.request.data = scrubObject(event.request.data);
    }
    if (event.extra) event.extra = scrubObject(event.extra);
    if (event.contexts) event.contexts = scrubObject(event.contexts);
    if (event.tags) event.tags = scrubObject(event.tags);
    // Mensaje y exception messages.
    if (event.message) event.message = redactString(event.message) as string;
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((ex) => ({
        ...ex,
        value: ex.value ? (redactString(ex.value) as string) : ex.value,
      }));
    }
    return event;
  },
});
