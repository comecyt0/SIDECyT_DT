'use client';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher?: typeof Pusher;
    Echo?: Echo<'reverb'>;
  }
}

let instance: Echo<'reverb'> | null = null;

/**
 * Devuelve el cliente Echo (Reverb) singleton.
 * - Si las env vars NEXT_PUBLIC_REVERB_* no están definidas, retorna null
 *   y el frontend cae automáticamente al polling cada 60s de useNotifications.
 * - El endpoint de autorización es /api/broadcasting/auth, que en el backend
 *   está dentro del grupo 'api.auth' y lee el JWT desde la cookie HttpOnly.
 */
export function getEcho(apiBaseUrl: string): Echo<'reverb'> | null {
  if (typeof window === 'undefined') return null;
  if (instance) return instance;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  // Sin NEXT_PUBLIC_REVERB_HOST/PORT/SCHEME se usa el origen de la propia página: IIS enruta
  // /app a Reverb (regla ReverbWS de web.config), así que el mismo build sirve igual por la IP
  // que por el dominio publicado detrás del balanceador.
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || window.location.protocol.replace(':', '');
  const host = process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname;
  const port = process.env.NEXT_PUBLIC_REVERB_PORT || window.location.port || (scheme === 'https' ? '443' : '80');

  if (!key) return null;

  // pusher-js es el cliente que Reverb usa bajo el capó
  window.Pusher = Pusher;

  instance = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: Number(port),
    wssPort: Number(port),
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBaseUrl}/broadcasting/auth`,
    auth: {
      headers: {
        Accept: 'application/json',
      },
    },
    // La cookie HttpOnly del JWT viaja automáticamente con XHR si el cliente
    // hace request con withCredentials. Pusher hace eso por defecto al
    // autorizar canales privados; sólo necesitamos un dominio compartido.
  });

  return instance;
}

export function disconnectEcho() {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}
