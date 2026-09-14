/**
 * Estados de la solicitud — fuente única de verdad para frontend.
 *
 * Mantener sincronizado con `apps/api/config/comecyt.php` (sección `estados`)
 * y con el flujo documentado en CLAUDE.md.
 *
 *   borrador → enviada → en_evaluacion → aprobada → convenio → ministracion
 *                                                              → seguimiento → cerrada
 *                ↕
 *            observada
 *   rechazada (desde: enviada | en_evaluacion | aprobada)
 *   cancelada (desde: borrador | enviada | observada | en_evaluacion)
 */

export type SolicitudEstado =
  | 'borrador'
  | 'enviada'
  | 'observada'
  | 'en_evaluacion'
  | 'aprobada'
  | 'rechazada'
  | 'convenio'
  | 'ministracion'
  | 'seguimiento'
  | 'cerrada'
  | 'cancelada';

interface EstadoMeta {
  /** Etiqueta corta visible al usuario. */
  label: string;
  /** Clase Tailwind para chips/badges. */
  badgeClass: string;
  /** Color de punto/timeline. */
  dotClass: string;
}

export const SOLICITUD_ESTADO_META: Record<SolicitudEstado, EstadoMeta> = {
  borrador:       { label: 'Borrador',       badgeClass: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300', dotClass: 'bg-neutral-400' },
  enviada:        { label: 'Enviada',        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',       dotClass: 'bg-amber-500' },
  observada:      { label: 'Observada',      badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',   dotClass: 'bg-orange-500' },
  en_evaluacion:  { label: 'En evaluación',  badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',   dotClass: 'bg-purple-500' },
  aprobada:       { label: 'Aprobada',       badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dotClass: 'bg-emerald-500' },
  rechazada:      { label: 'Rechazada',      badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',               dotClass: 'bg-red-500' },
  convenio:       { label: 'Convenio',       badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',               dotClass: 'bg-sky-500' },
  ministracion:   { label: 'Ministración',   badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',           dotClass: 'bg-teal-500' },
  seguimiento:    { label: 'Seguimiento',    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           dotClass: 'bg-blue-500' },
  cerrada:        { label: 'Cerrada',        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', dotClass: 'bg-emerald-600' },
  cancelada:      { label: 'Cancelada',      badgeClass: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',   dotClass: 'bg-neutral-500' },
};

/** Lista ordenada de todos los estados (para selects, filtros). */
export const SOLICITUD_ESTADOS: SolicitudEstado[] = Object.keys(SOLICITUD_ESTADO_META) as SolicitudEstado[];

export function estadoLabel(estado: string | null | undefined): string {
  if (!estado) return '—';
  return SOLICITUD_ESTADO_META[estado as SolicitudEstado]?.label ?? estado;
}

export function estadoBadgeClass(estado: string | null | undefined): string {
  if (!estado) return 'bg-neutral-100 text-neutral-500';
  return SOLICITUD_ESTADO_META[estado as SolicitudEstado]?.badgeClass ?? 'bg-neutral-100 text-neutral-500';
}

export function estadoDotClass(estado: string | null | undefined): string {
  if (!estado) return 'bg-neutral-300';
  return SOLICITUD_ESTADO_META[estado as SolicitudEstado]?.dotClass ?? 'bg-neutral-400';
}
