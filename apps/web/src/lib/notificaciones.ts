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
  reset_password: '/admin/reset-requests',
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
