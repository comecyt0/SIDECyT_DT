import Cookies from 'js-cookie';
import api from '@/lib/api';

/**
 * Borra todo lo que el navegador guarda del sistema (Cache Storage y service worker).
 * Desde el 24/09/2026 el SW ya no guarda HTML, pero un equipo que usó la versión anterior puede tener copias.
 */
export async function limpiarCachesLocales(): Promise<void> {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_CACHES' });
  } catch {
    // sin service worker
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Cache Storage no disponible (modo privado, navegador antiguo)
  }
}

/**
 * Cierre de sesión real (SEGURIDAD, 24/09/2026). Antes solo se borraban las cookies legibles por JS y la cookie
 * HttpOnly `comecyt_auth` seguía viva hasta 24 h: en un equipo compartido, la siguiente persona entraba con la
 * sesión anterior. Ahora el backend invalida el JWT (lista negra) y expira la cookie.
 */
export async function cerrarSesion(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Si el token ya había vencido, el backend responde 401: igual se limpia todo del lado del navegador.
  }
  Cookies.remove('token');
  Cookies.remove('userRole');
  Cookies.remove('userName');
  await limpiarCachesLocales();
  // replace: que "Atrás" no regrese a una página del panel.
  window.location.replace('/login');
}
