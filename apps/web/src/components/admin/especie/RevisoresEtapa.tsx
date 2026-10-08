'use client';

import { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import api from '@/lib/api';
import type { Revisa } from '@/lib/especie';

/**
 * E70 (08/10/2026, pedido del usuario) — En cada etapa de revisión el admin elige quién revisa (personas con el rol que
 * admite la etapa) y cuántas aprobaciones hacen falta para pasar a la siguiente. Sin personas, revisa cualquiera con ese
 * rol (como antes) y basta una aprobación. El servidor vuelve a validar todo.
 */
interface Candidato { id: number; nombre: string; rol: 'revisor' | 'admin_convocatoria' }

let cache: Promise<Candidato[]> | null = null;
function cargarCandidatos(): Promise<Candidato[]> {
  cache ??= api.get('/admin/especie/revisores-candidatos')
    .then(({ data }) => (Array.isArray(data) ? data.filter((c): c is Candidato => typeof c?.id === 'number' && typeof c?.nombre === 'string'
      && (c.rol === 'revisor' || c.rol === 'admin_convocatoria')) : []))
    .catch(() => { cache = null; return []; });
  return cache;
}

const ROL: Record<Candidato['rol'], string> = { revisor: 'Revisor', admin_convocatoria: 'Admin de convocatoria' };

export default function RevisoresEtapa({ idBase, revisa, revisores, aprobaciones, onChange }: {
  idBase: string; revisa: Revisa; revisores: number[]; aprobaciones: number;
  onChange: (p: { revisores: number[]; aprobaciones_requeridas: number }) => void;
}) {
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  useEffect(() => { let vivo = true; void cargarCandidatos().then((c) => { if (vivo) setCandidatos(c); }); return () => { vivo = false; }; }, []);

  const admitidos = (candidatos ?? []).filter((c) => revisa === 'ambos' || c.rol === revisa);
  const alternar = (id: number) => {
    const nuevos = revisores.includes(id) ? revisores.filter((x) => x !== id) : [...revisores, id];
    onChange({ revisores: nuevos, aprobaciones_requeridas: Math.min(Math.max(1, aprobaciones), Math.max(1, nuevos.length)) });
  };

  return (
    <fieldset className="mt-3 space-y-2 rounded-[14px] border px-3 py-3" style={{ borderColor: 'var(--app-rule)' }}>
      <legend className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">
        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />Personas que revisan (opcional)
      </legend>
      {candidatos === null ? (
        <p className="text-xs text-[var(--app-ink-2)]">Cargando personas…</p>
      ) : admitidos.length === 0 ? (
        <p className="text-xs text-[var(--app-ink-2)]">No hay personas activas con ese rol. Sin asignar, la revisa cualquiera con el rol elegido.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {admitidos.map((c) => {
            const activo = revisores.includes(c.id);
            return (
              <li key={c.id}>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ borderColor: activo ? 'var(--auth-vino)' : 'var(--app-rule)', background: activo ? 'var(--auth-vino-soft)' : 'transparent', color: 'var(--app-ink)' }}>
                  <input type="checkbox" checked={activo} onChange={() => alternar(c.id)} className="h-3.5 w-3.5 accent-[var(--auth-vino)]" />
                  {c.nombre} <span className="font-normal text-[var(--app-ink-2)]">· {ROL[c.rol]}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {revisores.some((id) => candidatos && !admitidos.some((c) => c.id === id)) && (
        <p className="text-xs font-semibold" style={{ color: 'var(--destructive)' }}>Hay personas asignadas que ya no corresponden al rol elegido: quítalas o cambia «Quién revisa».</p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={`${idBase}-apr`} className="font-semibold text-[var(--app-ink)]">Aprobaciones necesarias</label>
        <input id={`${idBase}-apr`} type="number" inputMode="numeric" min={1} max={Math.max(1, revisores.length)} disabled={revisores.length < 2}
          value={Math.max(1, aprobaciones)} className="auth-input auth-input-static w-20 pl-3"
          onChange={(e) => onChange({ revisores, aprobaciones_requeridas: Math.min(Math.max(1, Math.trunc(Number(e.target.value) || 1)), Math.max(1, revisores.length)) })} />
        <span className="text-xs text-[var(--app-ink-2)]">
          {revisores.length < 2 ? 'Con una persona o sin asignar, basta una aprobación.' : `de ${revisores.length} personas para pasar a la siguiente etapa.`}
        </span>
      </div>
    </fieldset>
  );
}
