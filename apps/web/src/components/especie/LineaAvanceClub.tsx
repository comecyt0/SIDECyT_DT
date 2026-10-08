import { Check, X } from 'lucide-react';
import type { AvanceClub } from '@/lib/especie';

/**
 * E52 — Línea de avance del club (decisión del usuario, §6.9): registro → revisiones → comité → aceptado → kit → evento,
 * con la etapa actual resaltada. En revisión dice en qué etapa va ("2 de 3"); si el club no fue aceptado, marca en rojo
 * dónde se decidió. Kit y evento se llenan con F3/F4 sin cambiar el componente.
 */
const PASOS = ['Registro', 'Revisiones', 'Comité', 'Aceptado', 'Kit', 'Evento'] as const;

function indiceDe(estado: string): number {
  switch (estado) {
    case 'borrador': return 0;
    case 'enviado': case 'observado': case 'vencido': case 'subsanado': return 1;
    case 'aprobado_revision': return 2;
    case 'aceptado': return 4;
    case 'kit_entregado': return 5;
    default: return 1;
  }
}

/**
 * E70 (08/10/2026, pedido del usuario): para el personal, quién hizo el último movimiento de cada paso, sacado del
 * historial del personal (el del líder no trae nombres). Índices de PASOS.
 */
export function quienesDeHistorial(historial: { resultado: string; quien?: string | null }[] | null | undefined): Partial<Record<number, string>> {
  const r: Partial<Record<number, string>> = {};
  for (const h of historial ?? []) {
    if (!h.quien) continue;
    if (h.resultado === 'enviado' || h.resultado === 'subsanado') r[0] = h.quien;
    else if (['aprobado', 'aprobacion', 'observado', 'rechazado', 'prorroga'].includes(h.resultado)) r[1] = h.quien;
    else if (h.resultado === 'visto_bueno' || h.resultado === 'comite_no_aceptado') r[2] = h.quien;
    else if (h.resultado === 'comite_aceptado') r[3] = h.quien;
  }
  return r;
}

export default function LineaAvanceClub({ estado, avance, quienes }: { estado: string; avance?: Partial<AvanceClub> | null; quienes?: Partial<Record<number, string>> }) {
  const rechazado = estado === 'rechazado';
  const fallo = rechazado ? (avance?.rechazo_origen === 'comite' ? 2 : 1) : -1;
  const actual = rechazado ? fallo : indiceDe(estado);
  const total = avance?.etapas?.length ?? 0;
  const detalle = (i: number): string | null => {
    if (i === 1 && avance?.etapa_actual && !rechazado) return total > 1 ? `${avance.etapa_actual.orden} de ${total}` : avance.etapa_actual.nombre;
    if (i === 2 && estado === 'aprobado_revision') return avance?.visto_bueno_at ? 'Visto bueno ✓' : 'Visto bueno pendiente';
    return null;
  };
  return (
    <ol className="grid grid-cols-6 gap-0.5" aria-label="Avance del club">
      {PASOS.map((texto, i) => {
        const hecho = i < actual;
        const enCurso = i === actual && !rechazado;
        const falla = i === fallo;
        const d = detalle(i);
        return (
          <li key={texto} className="flex min-w-0 flex-col items-center gap-1 text-center" aria-current={enCurso ? 'step' : undefined}>
            <span className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : ''}`} style={{ backgroundColor: hecho || enCurso || falla ? 'var(--auth-vino)' : 'var(--app-rule)' }} aria-hidden="true" />
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold sm:h-8 sm:w-8 sm:text-xs"
                style={falla
                  ? { backgroundColor: 'var(--auth-danger)', color: '#fff' }
                  : hecho
                    ? { backgroundColor: 'var(--auth-vino)', color: '#fff' }
                    : enCurso
                      ? { backgroundColor: 'var(--auth-vino-soft)', color: 'var(--auth-vino)', boxShadow: 'inset 0 0 0 2px var(--auth-vino)' }
                      : { backgroundColor: 'var(--auth-field)', color: 'var(--app-ink-2)' }}>
                {falla ? <X className="h-4 w-4" aria-hidden="true" /> : hecho ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === PASOS.length - 1 ? 'opacity-0' : ''}`} style={{ backgroundColor: hecho ? 'var(--auth-vino)' : 'var(--app-rule)' }} aria-hidden="true" />
            </span>
            <span className={`text-[10px] leading-tight sm:text-xs ${enCurso || falla ? 'font-bold text-[var(--app-ink)]' : 'text-[var(--app-ink-2)]'}`}>
              {texto}
              <span className="sr-only">{falla ? ' (no aceptado)' : hecho ? ' (completado)' : enCurso ? ' (en curso)' : ''}</span>
            </span>
            {d && <span className="hidden text-[10px] leading-tight text-[var(--app-ink-2)] sm:block">{d}</span>}
            {quienes?.[i] && (hecho || enCurso || falla) && (
              <span className="block max-w-full truncate text-[10px] leading-tight text-[var(--app-ink-2)]" title={`Último movimiento: ${quienes[i]}`}>
                <span className="sr-only">Último movimiento: </span>{quienes[i]}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
