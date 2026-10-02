'use client';

import { useId, useMemo, useState } from 'react';
import { Search, Plus, ListChecks, EyeOff, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SISTEMA_ETIQUETA, normalizarNombre, programaRepetido, type ProgramaCatalogo, type SistemaPrograma } from '@/lib/asistente-convocatoria';

export interface ValorPrograma { id: number | null; nuevo: boolean; nombre: string; sistema: SistemaPrograma }

const labelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const inputCls = 'auth-input auth-input-static pl-4';

/**
 * E54 — Paso 2 del asistente: ¿a qué programa pertenece la convocatoria? (p. ej. «Programa LEGO» → «Convocatoria 2026»).
 * Lista el catálogo de Contenido público (/admin/sitio) por sistema, con buscador; o crea un programa nuevo, que nace
 * oculto en la página pública hasta que el admin lo complete. Avisa si el nombre nuevo ya existe y ofrece usarlo.
 */
export default function SelectorPrograma({ catalogo, errorCarga, onReintentar, valor, onChange, error, maxNombre, soloExistentes = false }: {
  catalogo: ProgramaCatalogo[] | null;
  errorCarga: boolean;
  onReintentar: () => void;
  valor: ValorPrograma;
  onChange: (v: ValorPrograma) => void;
  error?: string;
  maxNombre: number;
  /** Cambiar el programa de una convocatoria existente: solo se elige de la lista (no se crea desde ahí). */
  soloExistentes?: boolean;
}) {
  const [q, setQ] = useState('');
  const idBase = useId();
  const elegir = (p: ProgramaCatalogo) => onChange({ id: p.id, nuevo: false, nombre: p.nombre, sistema: p.sistema });

  const grupos = useMemo(() => {
    const t = normalizarNombre(q);
    const lista = (catalogo ?? []).filter((p) => !t || normalizarNombre(p.nombre).includes(t));
    return (['sigae', 'sicei'] as SistemaPrograma[]).map((s) => ({ sistema: s, programas: lista.filter((p) => p.sistema === s) })).filter((g) => g.programas.length);
  }, [catalogo, q]);

  const repetido = valor.nuevo && catalogo ? programaRepetido(catalogo, valor.sistema, valor.nombre) : null;

  return (
    <div className="space-y-4">
      {!soloExistentes && <div role="radiogroup" aria-label="Programa de la convocatoria" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {([[false, 'Programa existente', 'Asocia esta convocatoria a un programa del catálogo.', ListChecks], [true, 'Programa nuevo', 'Se agrega al catálogo, oculto hasta que lo completes.', Plus]] as const).map(([nuevo, titulo, desc, Icono]) => (
          <button key={titulo} type="button" role="radio" aria-checked={valor.nuevo === nuevo}
            onClick={() => onChange(nuevo ? { id: null, nuevo: true, nombre: '', sistema: valor.sistema } : { id: null, nuevo: false, nombre: '', sistema: valor.sistema })}
            className="flex items-start gap-3 rounded-[14px] border-2 px-4 py-3 text-left transition-colors duration-150"
            style={{ borderColor: valor.nuevo === nuevo ? 'var(--auth-vino)' : 'var(--app-rule)', backgroundColor: valor.nuevo === nuevo ? 'var(--tile-vino-bg)' : 'transparent' }}>
            <Icono className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-ink)]" aria-hidden="true" />
            <span><span className="block text-sm font-semibold text-[var(--app-ink)]">{titulo}</span><span className="block text-xs text-[var(--app-ink-2)]">{desc}</span></span>
          </button>
        ))}
      </div>}

      {soloExistentes || !valor.nuevo ? (
        <div className="space-y-2">
          <label htmlFor={`${idBase}-q`} className={labelCls}>Programa *</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-ink-2)]" aria-hidden="true" />
            <input id={`${idBase}-q`} type="search" className={`${inputCls} !pl-9`} placeholder="Buscar programa por nombre" value={q} maxLength={120}
              onChange={(e) => setQ(e.target.value)} aria-describedby={error ? `${idBase}-err` : undefined} />
          </div>
          {catalogo === null ? (
            <p className="flex items-center gap-2 py-4 text-sm text-[var(--app-ink-2)]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Cargando programas…</p>
          ) : errorCarga ? (
            <p className="flex flex-wrap items-center gap-2 py-2 text-sm" style={{ color: 'var(--auth-danger)' }}>No se pudo cargar el catálogo de programas.
              <Button size="sm" variant="outline" onClick={onReintentar}>Reintentar</Button></p>
          ) : grupos.length === 0 ? (
            <p className="py-2 text-sm text-[var(--app-ink-2)]">{q ? 'Ningún programa coincide con la búsqueda.' : 'Todavía no hay programas en el catálogo.'} {soloExistentes ? 'Créalo en Contenido público.' : 'Puedes crearlo con «Programa nuevo».'}</p>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-[14px] border p-2" style={{ borderColor: 'var(--app-rule)' }}>
              {grupos.map((g) => (
                <div key={g.sistema} role="radiogroup" aria-label={SISTEMA_ETIQUETA[g.sistema]}>
                  <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-widest text-[var(--app-ink-2)]">{SISTEMA_ETIQUETA[g.sistema]}</p>
                  <ul className="space-y-1">
                    {g.programas.map((p) => {
                      const sel = valor.id === p.id;
                      return (
                        <li key={p.id}>
                          {/* Rejilla: nombre a todo lo ancho y, en teléfono, las píldoras debajo (antes el nombre se partía letra por letra). */}
                          <button type="button" role="radio" aria-checked={sel} onClick={() => elegir(p)}
                            className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-[10px] px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--tile-sky-bg)] sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                            style={{ backgroundColor: sel ? 'var(--tile-vino-bg)' : undefined, outline: sel ? '2px solid var(--auth-vino)' : undefined }}>
                            {sel ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" /> : <span className="h-4 w-4 shrink-0 rounded-full border-2" style={{ borderColor: 'var(--app-rule)' }} aria-hidden="true" />}
                            <span className="min-w-0 break-words text-sm text-[var(--app-ink)]">{p.nombre}</span>
                            <span className="col-start-2 flex flex-wrap items-center gap-1 sm:col-start-3 sm:justify-end">
                              {!p.activo && <span className="pill" data-tone="neutral" title="No se muestra en la página pública"><EyeOff className="h-3 w-3" aria-hidden="true" />Oculto</span>}
                              <span className="pill" data-tone={p.convocatorias ? 'sky' : 'neutral'}>{p.convocatorias} convocatoria{p.convocatorias === 1 ? '' : 's'}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--app-ink-2)]">{soloExistentes
            ? 'La lista es el catálogo de Contenido público. Cambiar el programa no modifica las preguntas, documentos ni solicitudes de la convocatoria.'
            : 'La lista es el catálogo de Contenido público. Las preguntas, documentos y criterios se capturan para esta convocatoria en los siguientes pasos.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <label htmlFor={`${idBase}-sis`} className={labelCls}>Sistema *</label>
            <select id={`${idBase}-sis`} className={inputCls} value={valor.sistema} onChange={(e) => onChange({ ...valor, sistema: e.target.value === 'sicei' ? 'sicei' : 'sigae' })}>
              <option value="sigae">SIGAE · Apoyo Empresarial</option>
              <option value="sicei">SICEI · Ciencia y Educación</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${idBase}-nom`} className={labelCls}>Nombre del programa *</label>
            <input id={`${idBase}-nom`} className={inputCls} maxLength={maxNombre} placeholder="Ej. Programa LEGO" value={valor.nombre}
              onChange={(e) => onChange({ ...valor, nombre: e.target.value })} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${idBase}-err` : undefined} />
          </div>
          {repetido ? (
            <p role="alert" className="flex flex-wrap items-center gap-2 rounded-[12px] px-3 py-2 text-sm sm:col-span-2" style={{ backgroundColor: 'var(--tile-gold-bg)', color: 'var(--app-ink)' }}>
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />Ya existe «{repetido.nombre}» en {repetido.sistema.toUpperCase()}.
              <Button size="sm" variant="outline" onClick={() => elegir(repetido)}>Usar el existente</Button>
            </p>
          ) : (
            <p className="text-xs text-[var(--app-ink-2)] sm:col-span-2">Se agrega al catálogo <strong>oculto</strong>: aparece en la página pública cuando completes su descripción y lo actives en Contenido público.</p>
          )}
        </div>
      )}

      {error && !repetido && <p id={`${idBase}-err`} role="alert" className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{error}</p>}
    </div>
  );
}
