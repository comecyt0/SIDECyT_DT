/**
 * Valida una URL que llega de la API antes de ponerla en `href`/`src`/`window.open` (SEGURIDAD, 24/09/2026).
 * Hoy todas las genera el servidor, pero un valor como `javascript:alert(1)` en un `href` se ejecutaría al hacer
 * clic. Solo se aceptan rutas del propio sitio (`/storage/…`, `/api/…`) y `https:` del mismo origen.
 * Devuelve `null` si no es segura: la vista debe ocultar el enlace.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const valor = raw.trim();
  // Rutas relativas del propio sitio (sin `//host`, que sería otro origen).
  if (/^\/(?!\/)/.test(valor)) return valor;
  try {
    const u = new URL(valor);
    if (typeof window !== 'undefined' && u.origin === window.location.origin) return u.pathname + u.search + u.hash;
    // Enlaces absolutos a la API interna o al dominio (URLs generadas por Laravel con APP_URL): se reducen a ruta.
    if (u.protocol === 'https:' && /^\/(storage|api)\//.test(u.pathname)) return u.pathname + u.search + u.hash;
    return null;
  } catch {
    return null;
  }
}
