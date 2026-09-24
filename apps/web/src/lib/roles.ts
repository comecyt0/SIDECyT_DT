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
} as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];

export type RolSlug = 'admin' | 'revisor' | 'evaluador' | 'solicitante' | 'admin_convocatoria' | 'consulta';

export const ROL_ETIQUETA: Record<RolSlug, string> = {
  admin: 'Administrador',
  admin_convocatoria: 'Administrador de convocatoria',
  consulta: 'Consulta',
  revisor: 'Revisor documental',
  evaluador: 'Evaluador técnico',
  solicitante: 'Solicitante',
};

/** Roles que usan el panel /admin (E45). */
export const ROLES_PANEL_ADMIN: RolSlug[] = ['admin', 'admin_convocatoria', 'consulta'];

/** E45: qué pantallas de /admin puede abrir cada rol delegado (el backend además aplica el alcance a los datos). */
export const SUBRUTAS_POR_ROL: Record<string, string[]> = {
  admin_convocatoria: [
    '/admin/dashboard', '/admin/solicitudes', '/admin/convocatorias', '/admin/folios', '/admin/convenios',
    '/admin/ministraciones', '/admin/informes', '/admin/evaluadores', '/admin/buzon', '/admin/cuenta', '/admin/perfiles',
  ],
  consulta: ['/admin/dashboard', '/admin/solicitudes', '/admin/folios', '/admin/cuenta', '/admin/perfiles'],
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

