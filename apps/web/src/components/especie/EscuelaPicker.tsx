'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search, Loader2, School, X } from 'lucide-react';
import api from '@/lib/api';
import { NIVEL_ESCUELA, SISTEMA_ESCUELA, type EscuelaApi } from '@/lib/especie';

/**
 * E52 — Buscador de escuelas del catálogo (GET /club/escuelas, mínimo 3 letras, máximo 20 resultados). Combobox con
 * teclado: flechas para moverse, Enter para elegir, Escape para cerrar.
 */
export default function EscuelaPicker({ value, onChange, invalido, id }: {
  value: EscuelaApi | null; onChange: (e: EscuelaApi | null) => void; invalido?: boolean; id?: string;
}) {
  const auto = useId();
  const inputId = id ?? `esc-${auto}`;
  const listaId = `${inputId}-lista`;
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<EscuelaApi[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const peticion = useRef(0);

  // `buscando` se enciende al escribir (onChange); el efecto solo agenda la petición.
  useEffect(() => {
    const t = q.trim();
    if (t.length < 3) return;
    const n = ++peticion.current;
    const h = window.setTimeout(() => {
      api.get('/club/escuelas', { params: { q: t } })
        .then(({ data }) => { if (n === peticion.current) { setResultados(Array.isArray(data) ? data.filter((e) => e && typeof e.id === 'number') : []); setActivo(-1); } })
        .catch(() => { if (n === peticion.current) setResultados([]); })
        .finally(() => { if (n === peticion.current) setBuscando(false); });
    }, 300);
    return () => window.clearTimeout(h);
  }, [q]);

  const elegir = (e: EscuelaApi) => { onChange(e); setQ(''); setAbierto(false); setResultados([]); };

  if (value) {
    return (
      <div className="flex items-start gap-3 rounded-[14px] border px-4 py-3" style={{ borderColor: 'var(--app-rule)', backgroundColor: 'var(--auth-field)' }}>
        <School className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-[var(--app-ink)]">{value.nombre}</span>
          <span className="block text-xs text-[var(--app-ink-2)]">
            <span className="font-mono">{value.cct}</span> · {value.municipio} · {NIVEL_ESCUELA[value.nivel] ?? value.nivel} · {SISTEMA_ESCUELA[value.sistema] ?? value.sistema}
          </span>
        </span>
        <button type="button" className="rounded-full p-1 text-[var(--app-ink-2)] hover:bg-[var(--app-rule)]" onClick={() => onChange(null)} aria-label="Cambiar de escuela">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const mostrar = abierto && q.trim().length >= 3;
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-[1.4rem] h-4 w-4 -translate-y-1/2 text-[var(--app-ink-2)]" aria-hidden="true" />
      <input id={inputId} role="combobox" aria-expanded={mostrar} aria-controls={listaId} aria-autocomplete="list"
        aria-activedescendant={activo >= 0 ? `${listaId}-${activo}` : undefined} aria-invalid={invalido ? 'true' : undefined}
        className="auth-input auth-input-static !pl-9" maxLength={120} value={q} placeholder="Nombre de la escuela, CCT o municipio"
        onChange={(e) => {
          const largo = e.target.value.trim().length >= 3;
          setQ(e.target.value); setAbierto(true); setBuscando(largo);
          if (!largo) { peticion.current++; setResultados([]); }
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, resultados.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter' && activo >= 0 && resultados[activo]) { e.preventDefault(); elegir(resultados[activo]); }
          else if (e.key === 'Escape') setAbierto(false);
        }} />
      {q.trim().length > 0 && q.trim().length < 3 && <p className="mt-1 text-xs text-[var(--app-ink-2)]">Escribe al menos 3 letras.</p>}
      {mostrar && (
        <ul id={listaId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-[14px] border bg-[var(--app-card-bg)] py-1 shadow-lg" style={{ borderColor: 'var(--app-rule)' }}>
          {buscando && <li className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--app-ink-2)]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Buscando…</li>}
          {!buscando && resultados.length === 0 && (
            <li className="px-4 py-3 text-sm text-[var(--app-ink-2)]">No encontramos esa escuela. Revisa el nombre o la CCT; si no aparece, pide al COMECYT que la agregue al catálogo.</li>
          )}
          {!buscando && resultados.map((e, i) => (
            <li key={e.id} id={`${listaId}-${i}`} role="option" aria-selected={i === activo}
              className={`cursor-pointer px-4 py-2.5 ${i === activo ? 'bg-[var(--auth-field)]' : ''}`}
              onMouseDown={(ev) => { ev.preventDefault(); elegir(e); }} onMouseEnter={() => setActivo(i)}>
              <span className="block break-words text-sm font-semibold text-[var(--app-ink)]">{e.nombre}</span>
              <span className="block text-xs text-[var(--app-ink-2)]"><span className="font-mono">{e.cct}</span> · {e.municipio} · {SISTEMA_ESCUELA[e.sistema] ?? e.sistema}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
