'use client';

import { CalendarDays, CircleAlert, CircleCheck, IdCard, User } from 'lucide-react';
import { FField, StaticField } from '@/components/registro/CamposAuth';
import { ddmmaaaaFecha, limpiarCurp, nombrePropio, revisarIdentidad, type Identidad } from '@/lib/curp';

/**
 * E76 (16/10/2026) — Nombre por partes, fecha de nacimiento y CURP verificada al momento (validador de lib/curp.ts,
 * el mismo que corre en el API). El sexo y el estado se leen de la CURP y se muestran para que la persona los confirme.
 * Si la CURP no coincide, la persona corrige o, si está segura, la manda a revisión manual del administrador.
 */
export function CamposIdentidad({ valor, onChange, id = 'r', revisor = 'un administrador' }: {
  valor: Identidad;
  onChange: (v: Identidad) => void;
  id?: string;
  revisor?: string;
}) {
  const r = revisarIdentidad(valor);
  const set = (cambio: Partial<Identidad>) => onChange({ ...valor, ...cambio, curp_revision: false });
  const hoy = new Date().toISOString().slice(0, 10);
  // Errores de campo solo cuando ya hay algo escrito: no regañar campos vacíos mientras se llena.
  const errorDe = (campo: keyof Identidad) => (String(valor[campo] ?? '').trim() !== '' ? r.campos[campo] : undefined);

  return (
    <div className="space-y-3">
      <FField id={`${id}-nombres`} icon={User} label="Nombre(s) *">
        <input value={valor.nombres} onChange={(e) => set({ nombres: e.target.value })} onBlur={() => onChange({ ...valor, nombres: nombrePropio(valor.nombres, true) })}
          maxLength={60} autoComplete="given-name" placeholder=" " className="auth-input" aria-invalid={!!errorDe('nombres') || undefined} />
      </FField>
      <MensajeCampo texto={errorDe('nombres')} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FField id={`${id}-apellido1`} icon={User} label="Primer apellido *">
            <input value={valor.primer_apellido} onChange={(e) => set({ primer_apellido: e.target.value })} onBlur={() => onChange({ ...valor, primer_apellido: nombrePropio(valor.primer_apellido) })}
              maxLength={60} autoComplete="family-name" placeholder=" " className="auth-input" aria-invalid={!!errorDe('primer_apellido') || undefined} />
          </FField>
          <MensajeCampo texto={errorDe('primer_apellido')} />
        </div>
        <div>
          <FField id={`${id}-apellido2`} icon={User} label={valor.sin_segundo ? 'Segundo apellido' : 'Segundo apellido *'}>
            <input value={valor.sin_segundo ? '' : valor.segundo_apellido} disabled={valor.sin_segundo} onChange={(e) => set({ segundo_apellido: e.target.value })}
              onBlur={() => onChange({ ...valor, segundo_apellido: nombrePropio(valor.segundo_apellido) })}
              maxLength={60} autoComplete="off" placeholder=" " className="auth-input disabled:opacity-60" aria-invalid={!!errorDe('segundo_apellido') || undefined} />
          </FField>
          <MensajeCampo texto={errorDe('segundo_apellido')} />
          <label className="mt-1.5 flex cursor-pointer items-center gap-2 px-1 text-xs text-[var(--auth-ink-2)]">
            <input type="checkbox" checked={valor.sin_segundo} onChange={(e) => set({ sin_segundo: e.target.checked, segundo_apellido: '' })}
              className="h-3.5 w-3.5 cursor-pointer rounded accent-[var(--auth-vino)]" />
            No tengo segundo apellido
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StaticField id={`${id}-fecha`} icon={CalendarDays} label="Fecha de nacimiento *">
          <input type="date" value={valor.fecha_nacimiento} max={hoy} min="1900-01-02" onChange={(e) => set({ fecha_nacimiento: e.target.value })}
            className="auth-input auth-input-static pl-4" autoComplete="bday" />
        </StaticField>
        <div>
          <FField id={`${id}-curp`} icon={IdCard} label="CURP *" ayuda={`${valor.curp.length}/18`}>
            <input value={valor.curp} onChange={(e) => set({ curp: limpiarCurp(e.target.value) })} autoComplete="off" spellCheck={false}
              placeholder=" " className="auth-input" aria-invalid={valor.curp.length === 18 && !!r.campos.curp || undefined} />
          </FField>
          {valor.curp.length === 18 && <MensajeCampo texto={r.campos.curp} />}
        </div>
      </div>

      <div aria-live="polite">
        {r.datos && (
          <p className="px-1 text-xs text-[var(--auth-ink-2)]">
            Según tu CURP: <strong className="text-[var(--auth-ink)]">{r.datos.sexoNombre}</strong> · lugar de nacimiento{' '}
            <strong className="text-[var(--auth-ink)]">{r.datos.entidadNombre}</strong>
            {r.datos.fecha && <> · fecha <strong className="text-[var(--auth-ink)]">{ddmmaaaaFecha(r.datos.fecha)}</strong></>}
          </p>
        )}
        {r.coincide && (
          <p className="mt-2 flex items-center gap-2 px-1 text-xs font-semibold" style={{ color: 'var(--tile-emerald-fg)' }}>
            <CircleCheck className="h-4 w-4 flex-none" aria-hidden="true" /> Tu CURP coincide con tu nombre y tu fecha de nacimiento.
          </p>
        )}
        {r.problemas.length > 0 && (
          <div className="mt-2 space-y-2 rounded-[var(--auth-radius-field)] border p-3.5" style={{ borderColor: 'var(--auth-danger)', background: 'var(--auth-field)' }}>
            <p className="flex items-center gap-2 text-sm font-bold text-[var(--auth-danger)]">
              <CircleAlert className="h-4 w-4 flex-none" aria-hidden="true" /> Tu CURP no coincide con tus datos
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed">
              {r.problemas.map((p) => <li key={p}>{p}</li>)}
            </ul>
            {r.revisable && (
              <label className="flex cursor-pointer items-start gap-2.5 border-t pt-2.5 text-xs leading-relaxed" style={{ borderColor: 'var(--auth-rule)' }}>
                <input type="checkbox" checked={valor.curp_revision} onChange={(e) => onChange({ ...valor, curp_revision: e.target.checked })}
                  className="mt-0.5 h-4 w-4 flex-none cursor-pointer rounded accent-[var(--auth-vino)]" />
                <span><strong>Mi CURP es correcta.</strong> Envíala a revisión: {revisor} la comparará con tus datos antes de aprobar tu cuenta.</span>
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MensajeCampo({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="mt-1 px-1 text-[11.5px] font-semibold text-[var(--auth-danger)]" role="alert">{texto}</p>;
}
