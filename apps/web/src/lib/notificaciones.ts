/** 02/10/2026 — Mismo patrón que App\Support\EnlaceAviso::PATRON: solo rutas internas de un panel. */
const PATRON_ENLACE = /^\/(admin|revisor|evaluador|solicitante|club|operador)(\/[A-Za-z0-9_-]+)*(\?[A-Za-z0-9_=&-]+)?$/;

/**
 * 02/10/2026 — A dónde lleva el aviso (lo arma el servidor según el rol de quien lo recibe). Se vuelve a validar aquí y
 * solo se usa si es del panel en el que está la persona (si cambió de rol después, se cae a las reglas de siempre).
 */
export function enlaceAviso(n: { enlace?: string | null }, pathname: string): string | null {
  const e = n.enlace;
  if (typeof e !== 'string' || e.length > 255 || !PATRON_ENLACE.test(e)) return null;
  const panel = '/' + (pathname.split('/')[1] ?? '');
  return e.startsWith(panel + '/') || e.startsWith(panel + '?') ? e : null;
}

/**
 * E45: a dónde lleva un aviso del buzón al pulsarlo. Devuelve null si la notificación no es del buzón.
 * El id se valida como entero positivo antes de ponerlo en la URL (el dato viene de la API).
 */
export function hrefBuzon(n: { tipo?: string; conversacion_id?: number | null }, base: string): string | null {
  if (n.tipo !== 'buzon_mensaje') return null;
  const id = Number(n.conversacion_id);
  return Number.isInteger(id) && id > 0 ? `${base}?hilo=${id}` : base;
}

/**
 * 24/09/2026: avisos del admin que piden una acción y llevan directo a la página donde se hace (recuperación de
 * contraseña, solicitud de acceso). Rutas fijas: nada de la notificación se interpola en la URL.
 */
const DESTINOS_ADMIN: Record<string, string> = {
  nueva_solicitud_acceso: '/admin/solicitudes-acceso',
  // E52 · F2: clubes que esperan una acción del personal.
  club_enviado: '/admin/clubes',
  club_por_revisar: '/admin/clubes',
  club_subsanado: '/admin/clubes',
  club_aprobado_revision: '/admin/clubes',
  // E55: solicitud de registro de escuela.
  escuela_solicitud: '/admin/escuelas?tab=solicitudes',
};

/** E52 · F2: avisos de clubes en los paneles de rol (revisor → su bandeja; líder → su panel). Rutas fijas. */
export function hrefAvisoClub(n: { tipo?: string }, pathname: string): string | null {
  if (!n.tipo || !n.tipo.startsWith('club_')) return null;
  if (pathname.startsWith('/revisor')) return '/revisor/clubes';
  if (pathname.startsWith('/club')) return '/club/dashboard';
  return null;
}

export function hrefAvisoAdmin(n: { tipo?: string }): string | null {
  return (n.tipo && Object.prototype.hasOwnProperty.call(DESTINOS_ADMIN, n.tipo)) ? DESTINOS_ADMIN[n.tipo] : null;
}
