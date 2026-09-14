'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, FileText, Users as UsersIcon, Building, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface SolicitudHit {
  id: number;
  folio: string;
  titulo_proyecto: string;
  estado: string;
  empresa?: { id: number; nombre: string } | null;
}

interface UsuarioHit {
  id: number;
  name: string;
  email: string;
  rol_id: number;
  activo: boolean;
  rol?: { id: number; nombre: string; slug: string } | null;
}

interface InstitucionHit {
  id: number;
  nombre: string;
  acronimo?: string | null;
}

interface SearchResponse {
  solicitudes: SolicitudHit[];
  usuarios: UsuarioHit[];
  instituciones: InstitucionHit[];
}

const EMPTY: SearchResponse = { solicitudes: [], usuarios: [], instituciones: [] };

interface GlobalSearchProps {
  /** Endpoint del backend a consultar (admin/revisor/evaluador). */
  endpoint?: string;
  /** Ruta destino al clickear una solicitud (cada rol tiene su listado). */
  solicitudHrefPattern?: (folio: string) => string;
}

export default function GlobalSearch({
  endpoint = '/admin/search',
  solicitudHrefPattern,
}: GlobalSearchProps = {}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    const handle = setTimeout(async () => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setLoading(true);
      try {
        const { data } = await api.get<SearchResponse>(endpoint, {
          params: { q: q.trim() },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResults(data ?? EMPTY);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults(EMPTY);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(handle);
    };
  }, [q, endpoint]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const showResults = open && q.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="flex-1 max-w-xs relative">
      {/* Desktop: input siempre visible */}
      <div className="hidden lg:flex w-full items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5 rounded-full ring-1 ring-neutral-200 dark:ring-neutral-700 focus-within:ring-primary/30 focus-within:bg-white dark:focus-within:bg-neutral-900 transition-all duration-300">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-300 shrink-0 animate-spin" />
        ) : (
          <Search className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-300 shrink-0" />
        )}
        <input
          type="text"
          placeholder="Buscar folio, usuario, institución…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 hover:text-primary uppercase tracking-wider"
          >
            limpiar
          </button>
        )}
      </div>

      {/* Mobile/tablet: botón ícono que abre el campo en el dropdown */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Buscar"
        className="lg:hidden p-2.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-primary/[8%] transition-all duration-200"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
      </button>

      {open && (
        <div className="lg:hidden absolute right-0 top-[calc(100%+8px)] w-[92vw] max-w-[420px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden z-50">
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-700 flex items-center gap-2">
            <Search className="h-4 w-4 text-neutral-500 dark:text-neutral-300 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar folio, usuario, institución…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            />
          </div>
          {showResults && (
            <div className="max-h-[60vh] overflow-y-auto">
              <SearchResultsBody loading={loading} q={q} results={results} onSelect={() => setOpen(false)} solicitudHrefPattern={solicitudHrefPattern} />
            </div>
          )}
        </div>
      )}

      {showResults && (
        <div className="hidden lg:block absolute left-0 top-[calc(100%+8px)] w-[420px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden z-50 max-h-[480px] overflow-y-auto">
          <SearchResultsBody loading={loading} q={q} results={results} onSelect={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

interface SearchResultsBodyProps {
  loading: boolean;
  q: string;
  results: SearchResponse;
  onSelect: () => void;
}

function SearchResultsBody({ loading, q, results, onSelect, solicitudHrefPattern }: SearchResultsBodyProps & { solicitudHrefPattern?: (folio: string) => string }) {
  const hrefFor = solicitudHrefPattern ?? ((folio: string) => `/admin/solicitudes?folio=${encodeURIComponent(folio)}`);
  const totalHits = results.solicitudes.length + results.usuarios.length + results.instituciones.length;

  if (loading && totalHits === 0) {
    return <div className="p-6 text-center text-xs text-neutral-500 dark:text-neutral-300">Buscando…</div>;
  }
  if (totalHits === 0) {
    return <div className="p-6 text-center text-xs text-neutral-500 dark:text-neutral-300">Sin resultados para “{q}”.</div>;
  }

  return (
    <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
      {results.solicitudes.length > 0 && (
        <div className="p-3">
          <p className="px-2 pb-2 text-[10px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-widest">Solicitudes</p>
          {results.solicitudes.map((s) => (
            <Link
              key={`s-${s.id}`}
              href={hrefFor(s.folio)}
              onClick={onSelect}
              className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <FileText className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">{s.titulo_proyecto}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-300 font-mono">
                  {s.folio} · <span className="uppercase">{s.estado}</span>
                  {s.empresa?.nombre && <> · {s.empresa.nombre}</>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {results.usuarios.length > 0 && (
        <div className="p-3">
          <p className="px-2 pb-2 text-[10px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-widest">Usuarios</p>
          {results.usuarios.map((u) => (
            <Link
              key={`u-${u.id}`}
              href={`/admin/usuarios?search=${encodeURIComponent(u.email)}`}
              onClick={onSelect}
              className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <UsersIcon className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">{u.name}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-300 truncate">
                  {u.email} · {u.rol?.nombre ?? `rol ${u.rol_id}`}
                  {!u.activo && <span className="text-red-500"> · inactivo</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {results.instituciones.length > 0 && (
        <div className="p-3">
          <p className="px-2 pb-2 text-[10px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-widest">Empresas</p>
          {results.instituciones.map((i) => (
            <Link
              key={`i-${i.id}`}
              href={`/admin/empresas?search=${encodeURIComponent(i.nombre)}`}
              onClick={onSelect}
              className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Building className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">{i.nombre}</p>
                {i.acronimo && <p className="text-[10px] text-neutral-500 dark:text-neutral-300 font-mono">{i.acronimo}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
