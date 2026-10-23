'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Search, Loader2, School, X, Hourglass, FilePlus2, MapPin, Users, Trophy } from 'lucide-react';
import api from '@/lib/api';
import { NIVEL_ESCUELA, SISTEMA_ESCUELA, urlMapaSegura, type DatosEscuela, type EscuelaApi } from '@/lib/especie';
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
/** E94: respuesta de /club/escuelas/{id}/datos validada (números y textos, el enlace solo si es de mapas). */
function leerDatos(d: unknown): DatosEscuela | null {
  const o = (d && typeof d === 'object' ? d : null) as Record<string, unknown> | null;
  if (!o || typeof o.id !== 'number') return null;
  const t = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  return { id: o.id, equipo_nombre: t(o.equipo_nombre), domicilio: t(o.domicilio), ubicacion_url: urlMapaSegura(o.ubicacion_url),
    matricula_total: n(o.matricula_total), matricula_hombres: n(o.matricula_hombres), matricula_mujeres: n(o.matricula_mujeres) };
}

/**
 * E94 (pedido del usuario): al elegir una escuela del catálogo se recuperan sus datos (equipo con el que participa,
 * domicilio, ubicación y matrícula) y se muestran en la tarjeta. `onDatos` se llama solo cuando la persona la elige aquí,
 * para sugerir el nombre del club; no se llama al mostrar una escuela ya guardada.
 */
export default function EscuelaPicker({ value, onChange, invalido, id, convocatoriaId, onDatos }: {
  value: EscuelaElegida | null; onChange: (e: EscuelaElegida | null) => void; invalido?: boolean; id?: string; convocatoriaId?: number;
  onDatos?: (d: DatosEscuela) => void;
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
  const [datos, setDatos] = useState<DatosEscuela | null>(null);
  const cache = useRef(new Map<number, DatosEscuela | null>());

  const cargarDatos = useCallback((escuelaId: number): Promise<DatosEscuela | null> => {
    if (cache.current.has(escuelaId)) return Promise.resolve(cache.current.get(escuelaId) ?? null);
    return api.get(`/club/escuelas/${escuelaId}/datos`).then(({ data }) => leerDatos(data)).catch(() => null)
      .then((d) => { cache.current.set(escuelaId, d); return d; });
  }, []);

  // Tarjeta de la escuela elegida (también la de un club ya guardado): trae sus datos sin pisar nada del formulario.
  const escuelaId = value && !value.solicitud && value.id > 0 ? value.id : null;
  useEffect(() => {
    if (!escuelaId) return;
    let vigente = true;
    void cargarDatos(escuelaId).then((d) => { if (vigente) setDatos(d); });
    return () => { vigente = false; };
  }, [escuelaId, cargarDatos]);
  const datosActuales = escuelaId && datos?.id === escuelaId ? datos : null;

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

  const elegir = (e: EscuelaApi) => {
    onChange(e); setQ(''); setAbierto(false); setResultados([]);
    if (onDatos) void cargarDatos(e.id).then((d) => { if (d) onDatos(d); });
  };

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
          {datosActuales && (datosActuales.equipo_nombre || datosActuales.domicilio || datosActuales.ubicacion_url || datosActuales.matricula_total !== null) && (
            <span className="mt-2 block space-y-1 border-t pt-2 text-xs text-[var(--app-ink-2)]" style={{ borderColor: 'var(--app-rule)' }}>
              {datosActuales.equipo_nombre && (
                <span className="flex items-start gap-1.5"><Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">Equipo registrado: <strong className="text-[var(--app-ink)]">{datosActuales.equipo_nombre}</strong></span></span>
              )}
              {(datosActuales.domicilio || datosActuales.ubicacion_url) && (
                <span className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{datosActuales.domicilio}{datosActuales.domicilio && datosActuales.ubicacion_url ? ' · ' : ''}
                    {datosActuales.ubicacion_url && (
                      <a href={datosActuales.ubicacion_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--app-ink)] underline-offset-2 hover:underline">Ver en el mapa</a>
                    )}</span></span>
              )}
              {datosActuales.matricula_total !== null && (
                <span className="flex items-start gap-1.5"><Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">Matrícula: {datosActuales.matricula_total}
                    {datosActuales.matricula_hombres !== null && datosActuales.matricula_mujeres !== null ? ` (${datosActuales.matricula_hombres} hombres · ${datosActuales.matricula_mujeres} mujeres)` : ''}</span></span>
              )}
            </span>
          )}
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
