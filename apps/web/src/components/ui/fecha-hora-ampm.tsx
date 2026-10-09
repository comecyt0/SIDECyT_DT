'use client';

import { useId } from 'react';
import { conAsterisco } from '@/components/ui/obligatorio';

const inputCls = 'auth-input auth-input-static pl-4';
const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';
const HORAS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/** 'AAAA-MM-DDTHH:mm' (24 h) ↔ partes con AM/PM. Vacío o incompleto → ''. */
export function partesDe(valor: string) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return { fecha: valor.slice(0, 10), hora: '', minuto: '00', ampm: 'AM' as 'AM' | 'PM' };
  const h24 = Number(m[2]);
  return { fecha: m[1], hora: String(h24 % 12 === 0 ? 12 : h24 % 12), minuto: m[3], ampm: (h24 >= 12 ? 'PM' : 'AM') as 'AM' | 'PM' };
}
export function valorDe(fecha: string, hora: string, minuto: string, ampm: 'AM' | 'PM'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !hora) return fecha ? `${fecha}T` : '';
  let h = Number(hora) % 12;
  if (ampm === 'PM') h += 12;
  return `${fecha}T${String(h).padStart(2, '0')}:${minuto}`;
}
/** ¿El valor está completo (fecha y hora)? */
export const fechaHoraCompleta = (v: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v);

/**
 * E56 (pedido del usuario, 02/10/2026) — Fecha y hora por separado, con la hora en formato de 12 horas y AM/PM (antes
 * era un solo campo `datetime-local` que, según el navegador, mostraba 24 h). Entrega y recibe 'AAAA-MM-DDTHH:mm' (24 h),
 * el mismo formato que esperaba el servidor.
 */
export default function FechaHoraAmPm({ value, onChange, etiquetaFecha = 'Fecha *', etiquetaHora = 'Hora *', max }: {
  value: string; onChange: (v: string) => void; etiquetaFecha?: string; etiquetaHora?: string; max?: string;
}) {
  const id = useId();
  const p = partesDe(value);
  const set = (c: Partial<typeof p>) => { const n = { ...p, ...c }; onChange(valorDe(n.fecha, n.hora, n.minuto, n.ampm)); };
  return (
    // 08/10/2026 (formulario del kit desfasado): dos columnas solo si el CONTENEDOR mide 34rem o más (no la pantalla), etiquetas
    // en bloque y de una línea, y el fieldset con min-w-0 (por defecto mide su contenido y se salía de la ventana).
    <div className="@container">
      <div className="grid grid-cols-1 items-start gap-3 @[34rem]:grid-cols-2">
      <div className="min-w-0 space-y-1.5">
        <label htmlFor={`${id}-f`} className={`${labelCls} block truncate`}>{conAsterisco(etiquetaFecha)}</label>
        <input id={`${id}-f`} type="date" className={inputCls} value={p.fecha} max={max?.slice(0, 10)} onChange={(e) => set({ fecha: e.target.value })} />
      </div>
      <fieldset className="m-0 min-w-0 space-y-1.5 border-0 p-0">
        <legend className={`${labelCls} block truncate p-0`}>{conAsterisco(etiquetaHora)}</legend>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Hora" className={`${inputCls} !w-20 !pl-3`} value={p.hora} onChange={(e) => set({ hora: e.target.value })}>
            <option value="">--</option>
            {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <span aria-hidden="true" className="font-bold text-[var(--app-ink)]">:</span>
          <select aria-label="Minutos" className={`${inputCls} !w-20 !pl-3`} value={p.minuto} onChange={(e) => set({ minuto: e.target.value })}>
            {MINUTOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div role="radiogroup" aria-label="AM o PM" className="inline-flex overflow-hidden rounded-full border" style={{ borderColor: 'var(--app-rule)' }}>
            {(['AM', 'PM'] as const).map((x) => (
              <button key={x} type="button" role="radio" aria-checked={p.ampm === x} onClick={() => set({ ampm: x })}
                className="px-3 py-2 text-sm font-semibold transition-colors"
                style={{ backgroundColor: p.ampm === x ? 'var(--auth-vino)' : 'transparent', color: p.ampm === x ? '#fff' : 'var(--app-ink)' }}>
                {x === 'AM' ? 'a. m.' : 'p. m.'}
              </button>
            ))}
          </div>
        </div>
      </fieldset>
      </div>
    </div>
  );
}
