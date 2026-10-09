'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search, Loader2, School, X, Hourglass, FilePlus2 } from 'lucide-react';
import api from '@/lib/api';
import { NIVEL_ESCUELA, SISTEMA_ESCUELA, type EscuelaApi } from '@/lib/especie';
import SolicitarEscuela, { type SolicitudEscuela } from '@/components/especie/SolicitarEscuela';
import EtiquetaEscuela from '@/components/especie/EtiquetaEscuela';

/** E55: escuela elegida = una del catálogo, o una solicitud propia en revisión (`solicitud`, con id de escuela 0). */
export type EscuelaElegida = EscuelaApi & { solicitud?: SolicitudEscuela };

/** Solicitud en revisión → valor del selector. */
export const escuelaDeSolicitud = (s: SolicitudEscuela): EscuelaElegida => ({ id: 0, cct: s.cct, nombre: s.nombre, municipio: s.municipio, nivel: s.nivel, sistema: s.sistema, solicitud: s });

/**
 * E52 — Buscador de escuelas del catálogo (GET /club/escuelas, mínimo 3 letras, máximo 20 resultados). Combobox con
 * teclado: flechas para moverse, Enter para elegir, Escape para cerrar.
 * E55: con `convocatoriaId`, si la escuela no aparece se puede «Solicitar registro de escuela» ahí mismo, o usar una
 * solicitud propia que siga en revisión.
 */
export default function EscuelaPicker({ value, onChange, invalido, id, convocatoriaId }: {
  value: EscuelaElegida | null; onChange: (e: EscuelaElegida | null) => void; invalido?: boolean; id?: string; convocatoriaId?: number;
}) {
  const auto = useId();
  const inputId = id ?? `esc-${auto}`;
  const listaId = `${inputId}-lista`;
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<EscuelaApi[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const [solicitando, setSolicitando] = useState(false);
  const [pendientes, setPendientes] = useState<SolicitudEscuela[]>([]);
  const peticion = useRef(0);

  // E55: solicitudes propias en revisión para esta convocatoria (se pueden reutilizar).
  useEffect(() => {
    if (!convocatoriaId) return;
    api.get('/club/escuelas/solicitudes')
      .then(({ data }) => setPendientes(Array.isArray(data)
        ? data.filter((s) => s && typeof s.id === 'number' && s.estado === 'pendiente' && s.convocatoria_id === convocatoriaId).slice(0, 3)
        : []))
      .catch(() => setPendientes([]));
  }, [convocatoriaId]);

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
    const pendiente = Boolean(value.solicitud);
    return (
      <div className="flex items-start gap-3 rounded-[14px] border px-4 py-3" style={{ borderColor: pendiente ? 'var(--tile-gold-fg, var(--app-rule))' : 'var(--app-rule)', backgroundColor: pendiente ? 'var(--tile-gold-bg)' : 'var(--auth-field)' }}>
        {pendiente ? <Hourglass className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <School className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 break-words text-sm font-semibold text-[var(--app-ink)]">{value.nombre}{!value.solicitud && <EtiquetaEscuela participo={value.participo_antes} />}</span>
          <span className="block text-xs text-[var(--app-ink-2)]">
            <span className="font-mono">{value.cct}</span> · {value.municipio} · {NIVEL_ESCUELA[value.nivel] ?? value.nivel} · {SISTEMA_ESCUELA[value.sistema] ?? value.sistema}
          </span>
          {pendiente && <span className="mt-1 block text-xs font-semibold text-[var(--app-ink)]">En revisión por el COMECYT: podrás enviar tu club cuando la den de alta.</span>}
        </span>
        <button type="button" className="rounded-full p-1 text-[var(--app-ink-2)] hover:bg-[var(--app-rule)]" onClick={() => onChange(null)} aria-label="Cambiar de escuela">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (solicitando && convocatoriaId) {
    return <SolicitarEscuela convocatoriaId={convocatoriaId} onCancelar={() => setSolicitando(false)}
      onEnviada={(s) => { setSolicitando(false); setPendientes((p) => [s, ...p]); onChange(escuelaDeSolicitud(s)); }} />;
  }

  const mostrar = abierto && q.trim().length >= 3;
  return (
    <div className="space-y-2">
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
              <li className="space-y-2 px-4 py-3 text-sm text-[var(--app-ink-2)]">
                <span className="block">No encontramos esa escuela. Revisa el nombre o la CCT{convocatoriaId ? '; si no está en el catálogo, solicita su registro.' : '; si no aparece, pide al COMECYT que la agregue al catálogo.'}</span>
                {/* La lista tapa el enlace de abajo: la acción va también aquí (onMouseDown para que el blur no la cierre antes). */}
                {convocatoriaId && (
                  <button type="button" className="inline-flex items-center gap-1.5 font-semibold text-[var(--app-ink)] underline-offset-2 hover:underline"
                    onMouseDown={(ev) => { ev.preventDefault(); setAbierto(false); setSolicitando(true); }}>
                    <FilePlus2 className="h-4 w-4" aria-hidden="true" />Solicitar registro de esta escuela
                  </button>
                )}
              </li>
            )}
            {!buscando && resultados.map((e, i) => (
              <li key={e.id} id={`${listaId}-${i}`} role="option" aria-selected={i === activo}
                className={`cursor-pointer px-4 py-2.5 ${i === activo ? 'bg-[var(--auth-field)]' : ''}`}
                onMouseDown={(ev) => { ev.preventDefault(); elegir(e); }} onMouseEnter={() => setActivo(i)}>
                <span className="flex flex-wrap items-center gap-2 break-words text-sm font-semibold text-[var(--app-ink)]">{e.nombre}<EtiquetaEscuela participo={e.participo_antes} /></span>
                <span className="block text-xs text-[var(--app-ink-2)]"><span className="font-mono">{e.cct}</span> · {e.municipio} · {SISTEMA_ESCUELA[e.sistema] ?? e.sistema}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {convocatoriaId && pendientes.map((s) => (
        <button key={s.id} type="button" onClick={() => onChange(escuelaDeSolicitud(s))}
          className="flex w-full items-center gap-2 rounded-[12px] border px-3 py-2 text-left text-sm text-[var(--app-ink)] hover:bg-[var(--auth-field)]" style={{ borderColor: 'var(--app-rule)' }}>
          <Hourglass className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 break-words">Usar mi solicitud en revisión: <strong>{s.nombre}</strong> ({s.cct})</span>
        </button>
      ))}
      {convocatoriaId && (
        <button type="button" onClick={() => setSolicitando(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-ink)] underline-offset-2 hover:underline">
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />¿No encuentras tu escuela? Solicitar registro de escuela
        </button>
      )}
    </div>
  );
}
