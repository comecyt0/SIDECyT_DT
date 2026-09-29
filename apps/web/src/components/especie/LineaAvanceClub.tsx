import { Check } from 'lucide-react';

/**
 * E52 — Línea de avance del club (decisión del usuario: el líder ve en qué etapa va). F1 cubre registro y envío; las
 * etapas siguientes (revisión, aceptación, kit) se llenan con F2–F4 sin cambiar el componente.
 */
const ETAPAS = [
  { clave: 'registro', texto: 'Registro' },
  { clave: 'revision', texto: 'Revisión' },
  { clave: 'aceptado', texto: 'Aceptado' },
  { clave: 'kit', texto: 'Entrega del kit' },
] as const;

function indiceDe(estado: string): number {
  switch (estado) {
    case 'borrador': return 0;
    case 'enviado': case 'observado': case 'subsanado': return 1;
    case 'aceptado': return 2;
    case 'kit_entregado': return 4;
    default: return 1;
  }
}

export default function LineaAvanceClub({ estado }: { estado: string }) {
  const actual = indiceDe(estado);
  const rechazado = estado === 'rechazado';
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Avance del club">
      {ETAPAS.map((e, i) => {
        const hecho = i < actual;
        const enCurso = i === actual && !rechazado;
        return (
          <li key={e.clave} className="flex min-w-0 flex-col items-center gap-1.5 text-center" aria-current={enCurso ? 'step' : undefined}>
            <span className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : ''}`} style={{ backgroundColor: hecho || enCurso ? 'var(--auth-vino)' : 'var(--app-rule)' }} aria-hidden="true" />
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold"
                style={hecho
                  ? { backgroundColor: 'var(--auth-vino)', color: '#fff' }
                  : enCurso
                    ? { backgroundColor: 'var(--auth-vino-soft)', color: 'var(--auth-vino)', boxShadow: 'inset 0 0 0 2px var(--auth-vino)' }
                    : { backgroundColor: 'var(--auth-field)', color: 'var(--app-ink-2)' }}>
                {hecho ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === ETAPAS.length - 1 ? 'opacity-0' : ''}`} style={{ backgroundColor: hecho ? 'var(--auth-vino)' : 'var(--app-rule)' }} aria-hidden="true" />
            </span>
            <span className={`text-[11px] leading-tight sm:text-xs ${enCurso ? 'font-bold text-[var(--app-ink)]' : 'text-[var(--app-ink-2)]'}`}>
              {e.texto}<span className="sr-only">{hecho ? ' (completado)' : enCurso ? ' (en curso)' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
