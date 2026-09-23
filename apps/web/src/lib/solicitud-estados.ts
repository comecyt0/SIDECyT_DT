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

/* 21/09/2026 — Píldoras vivas tipo sticker (rounded-full + borde grueso), decisión del usuario.
   Cada `badgeClass` es autónoma: forma + color, se aplica a cualquier <span> o <Badge> y twMerge
   resuelve conflictos. Prefijo común para no repetir la geometría de la píldora. */
const PILL = 'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold leading-tight whitespace-nowrap align-middle';

export const SOLICITUD_ESTADO_META: Record<SolicitudEstado, EstadoMeta> = {
  borrador:       { label: 'Borrador',       badgeClass: `${PILL} border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`,           dotClass: 'bg-slate-400' },
  enviada:        { label: 'Enviada',        badgeClass: `${PILL} border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/50 dark:bg-amber-900/40 dark:text-amber-200`,      dotClass: 'bg-amber-500' },
  observada:      { label: 'Observada',      badgeClass: `${PILL} border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-500/50 dark:bg-orange-900/40 dark:text-orange-200`, dotClass: 'bg-orange-500' },
  en_evaluacion:  { label: 'En evaluación',  badgeClass: `${PILL} border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-500/50 dark:bg-violet-900/40 dark:text-violet-200`, dotClass: 'bg-violet-500' },
  aprobada:       { label: 'Aprobada',       badgeClass: `${PILL} border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-900/40 dark:text-emerald-200`, dotClass: 'bg-emerald-500' },
  rechazada:      { label: 'Rechazada',      badgeClass: `${PILL} border-red-300 bg-red-100 text-red-800 dark:border-red-500/50 dark:bg-red-900/40 dark:text-red-200`,                dotClass: 'bg-red-500' },
  convenio:       { label: 'Convenio',       badgeClass: `${PILL} border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-500/50 dark:bg-sky-900/40 dark:text-sky-200`,                dotClass: 'bg-sky-500' },
  ministracion:   { label: 'Ministración',   badgeClass: `${PILL} border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-500/50 dark:bg-teal-900/40 dark:text-teal-200`,           dotClass: 'bg-teal-500' },
  seguimiento:    { label: 'Seguimiento',    badgeClass: `${PILL} border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-500/50 dark:bg-blue-900/40 dark:text-blue-200`,           dotClass: 'bg-blue-500' },
  cerrada:        { label: 'Cerrada',        badgeClass: `${PILL} border-emerald-400 bg-emerald-200 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-800/50 dark:text-emerald-100`, dotClass: 'bg-emerald-600' },
  cancelada:      { label: 'Cancelada',      badgeClass: `${PILL} border-neutral-300 bg-neutral-200 text-neutral-600 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300`, dotClass: 'bg-neutral-500' },
};

/** Lista ordenada de todos los estados (para selects, filtros). */
export const SOLICITUD_ESTADOS: SolicitudEstado[] = Object.keys(SOLICITUD_ESTADO_META) as SolicitudEstado[];

export function estadoLabel(estado: string | null | undefined): string {
  if (!estado) return '—';
  return SOLICITUD_ESTADO_META[estado as SolicitudEstado]?.label ?? estado;
}

export function estadoBadgeClass(estado: string | null | undefined): string {
  const fallback = `${PILL} border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300`;
  if (!estado) return fallback;
  return SOLICITUD_ESTADO_META[estado as SolicitudEstado]?.badgeClass ?? fallback;
}

export function estadoDotClass(estado: string | null | undefined): string {
  if (!estado) return 'bg-neutral-300';
  return SOLICITUD_ESTADO_META[estado as SolicitudEstado]?.dotClass ?? 'bg-neutral-400';
}
