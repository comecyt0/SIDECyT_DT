'use client';

import type { CampoApi } from '@/lib/especie';

const inputCls = 'auth-input auth-input-static pl-4';

/** E52 — Entrada de una pregunta personalizada del club o del integrante (texto, número, fecha, texto largo o lista). */
export default function CampoDinamico({ campo, valor, onChange, idBase, error }: {
  campo: CampoApi; valor: unknown; onChange: (v: string) => void; idBase: string; error?: string;
}) {
  const id = `${idBase}-${campo.nombre_campo}`;
  const v = valor === null || valor === undefined ? '' : String(valor);
  const comun = { id, 'aria-invalid': error ? ('true' as const) : undefined, 'aria-describedby': error ? `${id}-err` : undefined };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">
        {campo.etiqueta}{campo.requerido ? ' *' : ' (opcional)'}
      </label>
      {campo.tipo_campo === 'textarea' ? (
        <textarea {...comun} maxLength={2000} value={v} onChange={(e) => onChange(e.target.value)} className={`${inputCls} !h-auto min-h-[90px] resize-y py-3`} />
      ) : campo.tipo_campo === 'select' ? (
        <select {...comun} value={v} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">Elige una opción</option>
          {(Array.isArray(campo.opciones_json) ? campo.opciones_json : []).map((o) => <option key={String(o.id)} value={String(o.id)}>{o.label}</option>)}
        </select>
      ) : (
        <input {...comun} type={campo.tipo_campo === 'number' ? 'number' : campo.tipo_campo === 'date' ? 'date' : 'text'}
          maxLength={campo.tipo_campo === 'text' ? 255 : undefined} value={v} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
      {error && <p id={`${id}-err`} className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{error}</p>}
    </div>
  );
}
