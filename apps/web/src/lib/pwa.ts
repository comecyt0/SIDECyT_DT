/**
 * PWA helpers — service worker registration + Web Push subscription.
 *
 * Diseñado para degradar elegantemente: si el browser no soporta SW o Push,
 * todas las funciones retornan un estado/valor neutro en lugar de tirar.
 *
 * VAPID:
 *   - El backend genera el par de llaves VAPID (público + privado) y expone
 *     el público vía un endpoint (p. ej. GET /api/push/vapid-public-key).
 *   - El cliente pasa esa pública (base64-url) a `subscribeToPush()`.
 *   - El endpoint /api/push/subscribe (TODO backend) persiste la suscripción
 *     contra el `user_id` autenticado.
 */
import api from '@/lib/api';

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): PushPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as PushPermission;
}

/**
 * Registra `/sw.js` con scope raíz. No-op si el browser no soporta SW.
 * Retorna el registration o null.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    // No rompemos UX si SW falla; solo log.
    console.warn('[pwa] Service worker registration failed:', err);
    return null;
  }
}

/**
 * Pide permiso de notificaciones al usuario. Devuelve el estado final.
 */
export async function requestNotificationPermission(): Promise<PushPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result as PushPermission;
  } catch {
    return 'denied';
  }
}

/**
 * Convierte la clave pública VAPID (base64url) al Uint8Array que
 * espera PushManager.subscribe(). Implementación canónica del W3C.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  // Use a fresh ArrayBuffer (not ArrayBufferLike) so the type matches
  // PushSubscriptionOptionsInit.applicationServerKey (BufferSource).
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * Crea la suscripción push contra el navegador y la POSTea al backend.
 *
 * Payload esperado por `/api/push/subscribe` (TODO backend):
 * {
 *   endpoint: string,            // URL del push service del navegador
 *   keys: {
 *     p256dh: string,            // clave pública del cliente (base64)
 *     auth: string               // secret auth (base64)
 *   },
 *   user_agent: string,
 *   created_at: string (ISO)
 * }
 * El backend debe guardar (user_id, endpoint UNIQUE, keys.p256dh, keys.auth)
 * y luego usar una librería tipo `minishlink/web-push` (PHP) para enviar
 * notificaciones firmadas con la clave privada VAPID.
 */
export async function subscribeToPush(
  applicationServerKey: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
      });
    } catch (err) {
      console.warn('[pwa] PushManager.subscribe failed:', err);
      return null;
    }
  }

  // Build the JSON-serializable payload that the backend persists.
  const json = subscription.toJSON();
  const payload = {
    endpoint: json.endpoint,
    keys: json.keys ?? {},
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    created_at: new Date().toISOString(),
  };

  try {
    // TODO(backend): implementar `POST /push/subscribe` que:
    //   1. Lee `auth()->user()->id`
    //   2. UPSERT en tabla `push_subscriptions` por (user_id, endpoint)
    //   3. Devuelve 201 con { id }
    await api.post('/push/subscribe', payload);
  } catch (err) {
    // Backend aún no implementa el endpoint — degradamos: la suscripción del
    // navegador queda creada, pero el servidor no podrá enviarle pushes.
    console.info(
      '[pwa] /push/subscribe no disponible aún (backend pendiente). Payload:',
      payload,
      err
    );
  }

  return subscription;
}

/**
 * Cancela la suscripción local Y notifica al backend (best-effort).
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  const ok = await subscription.unsubscribe();

  try {
    // TODO(backend): `POST /push/unsubscribe` que borre la suscripción por endpoint.
    await api.post('/push/unsubscribe', { endpoint });
  } catch (err) {
    console.info('[pwa] /push/unsubscribe no disponible aún:', err);
  }

  return ok;
}

/**
 * Devuelve la suscripción actual del navegador (si existe).
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}
