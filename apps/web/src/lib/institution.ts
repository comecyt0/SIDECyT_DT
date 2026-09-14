/**
 * Configuración institucional centralizada.
 *
 * Permite que el sistema sea 100% personalizable cambiando las variables de
 * entorno (sin tocar código). Todos los componentes deben leer nombre, lema,
 * estado, correo de contacto, etc. desde este módulo.
 *
 * Variables de entorno aceptadas:
 *   NEXT_PUBLIC_INSTITUTION_NAME       — Nombre corto (ej. "COMECYT")
 *   NEXT_PUBLIC_INSTITUTION_FULL_NAME  — Nombre completo (ej. "Consejo Mexiquense de Ciencia y Tecnología")
 *   NEXT_PUBLIC_INSTITUTION_TAGLINE    — Lema corto (ej. "Plataforma Institucional COMECYT")
 *   NEXT_PUBLIC_INSTITUTION_STATE      — Entidad política (ej. "Estado de México")
 *   NEXT_PUBLIC_INSTITUTION_EMAIL      — Correo de contacto (ej. "administracion@comecyt.gob.mx")
 *   NEXT_PUBLIC_INSTITUTION_EMAIL_HINT — Placeholder de inputs de correo (ej. "usuario@institucion.edu.mx")
 *   NEXT_PUBLIC_INSTITUTION_SECURITY_BADGE — Mensaje del badge inferior del login
 */
export const INSTITUTION = {
  name: process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'COMECYT',
  fullName:
    process.env.NEXT_PUBLIC_INSTITUTION_FULL_NAME ||
    'Consejo Mexiquense de Ciencia y Tecnología',
  tagline:
    process.env.NEXT_PUBLIC_INSTITUTION_TAGLINE || 'Plataforma Institucional COMECYT',
  systemTagline:
    process.env.NEXT_PUBLIC_INSTITUTION_SYSTEM_TAGLINE ||
    'Gestión De Proyectos de Desarrollo Tecnológico y Vinculación',
  state: process.env.NEXT_PUBLIC_INSTITUTION_STATE || 'Estado de México',
  contactEmail:
    process.env.NEXT_PUBLIC_INSTITUTION_EMAIL || 'administracion@comecyt.gob.mx',
  emailHint:
    process.env.NEXT_PUBLIC_INSTITUTION_EMAIL_HINT || 'usuario@institucion.edu.mx',
  securityBadge:
    process.env.NEXT_PUBLIC_INSTITUTION_SECURITY_BADGE ||
    'Acceso Institucional Cifrado 256-bit',
  locale: process.env.NEXT_PUBLIC_INSTITUTION_LOCALE || 'es-MX',
  currency: process.env.NEXT_PUBLIC_INSTITUTION_CURRENCY || 'MXN',
} as const;

/**
 * Texto de copyright dinámico. Usa el año actual y el nombre institucional.
 */
export function copyrightLine(): string {
  return `© ${new Date().getFullYear()} ${INSTITUTION.name} · ${INSTITUTION.state} · Todos los derechos reservados`;
}
