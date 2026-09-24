import type { Convocatoria, EstadoPublicoConvocatoria } from '@/types/api';

/**
 * Estado público de una convocatoria (E40): mismo significado en el panel y en la landing.
 * El backend lo calcula (App\Models\Convocatoria::getEstadoPublicoAttribute); aquí solo se pinta.
 * `tone` usa los tonos de la capa de píldoras (`.pill[data-tone]`, globals.css).
 */
export const ESTADO_PUBLICO: Record<EstadoPublicoConvocatoria, { label: string; tone: string; ayuda: string }> = {
  borrador: { label: 'Borrador', tone: 'neutral', ayuda: 'No se publica: nadie la ve todavía.' },
  proxima: { label: 'Próxima a abrir', tone: 'sky', ayuda: 'Publicada; recibe solicitudes a partir de su fecha de apertura.' },
  abierta: { label: 'Abierta', tone: 'emerald', ayuda: 'Recibe solicitudes hasta su fecha de cierre.' },
  prorroga: { label: 'Con prórroga', tone: 'amber', ayuda: 'Recibe solicitudes con el plazo ampliado.' },
  cerrada: { label: 'Cerrada', tone: 'neutral', ayuda: 'Ya no recibe solicitudes.' },
};

export function estadoPublico(c: Pick<Convocatoria, 'estado' | 'estado_publico'>): EstadoPublicoConvocatoria {
  if (c.estado_publico) return c.estado_publico;
  return c.estado === 'borrador' ? 'borrador' : c.estado === 'cerrada' ? 'cerrada' : 'abierta';
}

/** Se puede dar prórroga a todo lo publicado (incluso cerrada: la prórroga la reabre). */
export const puedeProrrogar = (c: Pick<Convocatoria, 'estado'>) => c.estado !== 'borrador';
