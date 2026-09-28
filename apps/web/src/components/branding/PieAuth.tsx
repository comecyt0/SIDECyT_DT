import { copyrightLine } from '@/lib/institution';

/**
 * Pie de las páginas de acceso (login, recuperar contraseña, solicitar acceso). La franja institucional va en el
 * encabezado (`BandaInstitucional`), no aquí (regla del usuario, 28/09/2026).
 */
export default function PieAuth() {
  return <footer className="px-6 pb-6 text-center text-xs text-[var(--auth-ink-2)]">{copyrightLine()}</footer>;
}
