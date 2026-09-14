 
/**
 * COMECYT Service Worker — Offline shell + Web Push (W3C standard).
 *
 * Strategies:
 *   - Cache-first  → static assets (logo, fonts, /_next/static/*, SVGs, woff(2), images)
 *   - Network-first → /api/* (never cache sensitive data; offline ⇒ fallback to cached if any GET)
 *   - Network-only → everything else (HTML navigations) with a graceful offline message
 *
 * No third-party FCM/OneSignal — only the W3C Push API. VAPID keys are provided
 * by the backend at runtime and consumed via PushManager.subscribe().
 */

const CACHE_VERSION = 'comecyt-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  '/logo.png',
  '/favicon.ico',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // If precache fails (offline install, etc.) we still want the SW to install.
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === '/logo.png') return true;
  if (url.pathname === '/favicon.ico') return true;
  if (url.pathname === '/manifest.webmanifest') return true;
  if (url.pathname.startsWith('/_next/static/')) return true;
  if (/\.(woff2?|ttf|otf|eot)$/i.test(url.pathname)) return true;
  if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname)) return true;
  return false;
}

function isApiRequest(url) {
  // Same-origin /api/* OR cross-origin to the configured API host.
  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname.includes('/api/')) return true;
  return false;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Last resort: return whatever we have or rethrow.
    const fallback = await caches.match(request);
    if (fallback) return fallback;
    throw err;
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Do NOT cache API responses — they may contain sensitive data.
    return response;
  } catch {
    // Only attempt a fallback for safe GETs.
    if (request.method === 'GET') {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Sin conexión' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Ignore non-GET for caching; let them pass through (network-first for API POSTs).
  const url = new URL(request.url);

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.method !== 'GET') return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigations / HTML: network-first with runtime cache fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            '<html><body style="font-family:system-ui;padding:2rem;text-align:center"><h1>Sin conexión</h1><p>No hay conexión a internet. Inténtalo de nuevo cuando estés en línea.</p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
  }
});

/* ───────────────────────── Web Push ───────────────────────── */

self.addEventListener('push', (event) => {
  let payload = { title: 'COMECYT', body: 'Tienes una nueva notificación.', url: '/' };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      // Fallback to plain text body.
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || 'comecyt-notification',
    renotify: !!payload.renotify,
    requireInteraction: !!payload.requireInteraction,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab on the same origin if available.
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && 'focus' in client) {
            client.navigate(targetUrl).catch(() => {});
            return client.focus();
          }
        } catch {
          // skip
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
