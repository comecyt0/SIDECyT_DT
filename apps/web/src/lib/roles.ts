/**
 * Centralized role IDs — must stay in sync with config/comecyt.php on the backend.
 * Backend source of truth: config('comecyt.roles.X')
 * Frontend equivalent: ROLES.X
 */
export const ROLES = {
  ADMIN: 1,
  REVISOR: 2,
  EVALUADOR: 3,
  SOLICITANTE: 4,
  // E45 (24/09/2026)
  ADMIN_CONVOCATORIA: 5,
  CONSULTA: 6,
  // E52 (29/09/2026): líder de un club escolar (Apoyo en especie).
  LIDER_CLUB: 7,
  // E52 · F4 (29/09/2026): escanea el QR de los clubes en los eventos de sus convocatorias asignadas.
  OPERADOR_EVENTO: 8,
} as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];

export type RolSlug = 'admin' | 'revisor' | 'evaluador' | 'solicitante' | 'admin_convocatoria' | 'consulta' | 'lider_club' | 'operador_evento';

export const ROL_ETIQUETA: Record<RolSlug, string> = {
  admin: 'Administrador',
  admin_convocatoria: 'Administrador de convocatoria',
  consulta: 'Consulta',
  revisor: 'Revisor documental',
  evaluador: 'Evaluador técnico',
  solicitante: 'Participante',
  lider_club: 'Líder de club',
  operador_evento: 'Operador de evento',
};

/** E52: roles que una persona puede pedir por su cuenta (registro general y "Mis roles"). Igual que el backend. */
export const ROLES_AUTOSERVICIO = ['solicitante', 'lider_club', 'evaluador'] as const;
export type RolAutoservicio = (typeof ROLES_AUTOSERVICIO)[number];

/** Panel de inicio de cada rol (lo comparten el login, "Mis roles" y proxy.ts). */
export const PANEL_POR_ROL: Record<RolSlug, string> = {
  admin: '/admin/dashboard',
  admin_convocatoria: '/admin/dashboard',
  consulta: '/admin/dashboard',
  revisor: '/revisor/solicitudes',
  evaluador: '/evaluador/evaluaciones',
  solicitante: '/solicitante/dashboard',
  lider_club: '/club/dashboard',
  operador_evento: '/operador/escanear',
};

/** Roles que usan el panel /admin (E45). */
export const ROLES_PANEL_ADMIN: RolSlug[] = ['admin', 'admin_convocatoria', 'consulta'];

/** E45: qué pantallas de /admin puede abrir cada rol delegado (el backend además aplica el alcance a los datos). */
export const SUBRUTAS_POR_ROL: Record<string, string[]> = {
  admin_convocatoria: [
    '/admin/dashboard', '/admin/solicitudes', '/admin/convocatorias', '/admin/folios', '/admin/convenios',
    '/admin/ministraciones', '/admin/informes', '/admin/evaluadores', '/admin/buzon', '/admin/cuenta', '/admin/perfiles',
    '/admin/clubes', '/admin/escanear',
    // E55: solo la pestaña de solicitudes de registro de escuela (el catálogo lo edita el admin general).
    '/admin/escuelas',
  ],
  consulta: ['/admin/dashboard', '/admin/solicitudes', '/admin/folios', '/admin/cuenta', '/admin/perfiles', '/admin/clubes'],
};

export function subrutaPermitida(rol: string, path: string): boolean {
  const lista = SUBRUTAS_POR_ROL[rol];
  if (!lista) return true;
  // Consulta: solo lectura también en la interfaz — nada de pantallas de alta/edición.
  if (rol === 'consulta' && /\/(nueva|editar)(\/|$)/.test(path)) return false;
  // Admin de convocatoria: no crea ni edita convocatorias (solo el admin general).
  if (rol === 'admin_convocatoria' && /^\/admin\/convocatorias\/(nueva|\d+\/editar)/.test(path)) return false;
  return lista.some((p) => path === p || path.startsWith(p + '/'));
}

