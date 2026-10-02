'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Shapes, Loader2, Search, Users, School, ChevronRight, Inbox, Gavel, Truck } from 'lucide-react';
import LogisticaConvocatoria from '@/components/especie/LogisticaConvocatoria';
import { useRol } from '@/hooks/useRol';
import BandejaClubes from '@/components/especie/BandejaClubes';
import ActaComite from '@/components/especie/ActaComite';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import { ESTADO_CLUB, SISTEMA_ESCUELA } from '@/lib/especie';
import FotoClub from '@/components/especie/FotoClub';
import { formatDate } from '@/lib/format';
import Folio from '@/components/ui/folio';

interface ConvEspecie { id: number; nombre: string; fecha_apertura: string | null; fecha_cierre: string | null; clubes_count: number; enviados_count: number }
interface ClubFila {
  id: number; folio: string; nombre: string; estado: string; logo_url: string | null; enviado_at: string | null; integrantes_count: number;
  convocatoria_corto?: string | null;
  escuela: { cct: string; nombre: string; municipio: string; sistema: string } | null;
  lider: { name: string; email: string } | null;
}

function err(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string } } })?.response?.data;
  return d?.message || def;
}

type Pestana = 'pendientes' | 'comite' | 'logistica' | 'todos';

/**
 * E52 · F1/F2 — Clubes de las convocatorias de Apoyo en especie (admin, admin de convocatoria y consulta, cada quien con
 * su alcance: lo aplica el servidor). Pestañas: "Por revisar" (su bandeja), "Comité" (acta + aprobados en revisión y
 * aceptados de la convocatoria) y "Todos". Consulta solo ve "Todos".
 */
export default function ClubesAdminPage() {
  const { rol, listo } = useRol();
  const opera = rol === 'admin' || rol === 'admin_convocatoria';
  const [pestana, setPestana] = useState<Pestana>('todos');
  const [pestanaElegida, setPestanaElegida] = useState(false);
  // Primera vez: quien opera empieza en su bandeja; consulta en "Todos".
  if (listo && !pestanaElegida) { setPestanaElegida(true); if (opera) setPestana('pendientes'); }
  const [convs, setConvs] = useState<ConvEspecie[]>([]);
  const [convId, setConvId] = useState<number | null>(null);
  const [clubes, setClubes] = useState<ClubFila[]>([]);
  const [cargandoConvs, setCargandoConvs] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/especie/convocatorias')
      .then(({ data }) => {
        const lista: ConvEspecie[] = Array.isArray(data) ? data.filter((c) => c && typeof c.id === 'number') : [];
        setConvs(lista);
        const pedida = Number(new URLSearchParams(window.location.search).get('convocatoria'));
        setConvId(lista.some((c) => c.id === pedida) ? pedida : (lista[0]?.id ?? null));
      })
      .catch((e) => setAviso(err(e, 'No se pudieron cargar las convocatorias.')))
      .finally(() => setCargandoConvs(false));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(busqueda.trim()), 350);
    return () => window.clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    if (!convId) { setClubes([]); return; }
    setCargando(true);
    try {
      const params: Record<string, string> = {};
      if (estado) params.estado = estado;
      if (q) params.q = q;
      const { data } = await api.get(`/admin/convocatorias/${convId}/clubes`, { params });
      setClubes(Array.isArray(data) ? data.filter((c) => c && typeof c.id === 'number') : []);
    } catch (e) {
      setAviso(err(e, 'No se pudieron cargar los clubes.'));
      setClubes([]);
    } finally {
      setCargando(false);
    }
  }, [convId, estado, q]);
  useEffect(() => { void cargar(); }, [cargar]);

  const elegir = (id: number) => {
    setConvId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('convocatoria', String(id));
    window.history.replaceState(window.history.state, '', url.toString());
  };

  const actual = convs.find((c) => c.id === convId) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader title="Clubes" eyebrow="Apoyo en especie" icon={<Shapes className="h-5 w-5" />}
        description="Clubes que los líderes registraron en cada convocatoria de Apoyo en especie: en captura y enviados a revisión." />
      {aviso && <AlertBox type="error" message={aviso} onClose={() => setAviso(null)} />}

      {cargandoConvs ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
      ) : convs.length === 0 ? (
        <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
          <span className="tone-chip" data-tone="violet"><Shapes aria-hidden="true" /></span>
          <p className="font-bold text-[var(--app-ink)]">No hay convocatorias de Apoyo en especie</p>
          <p className="text-sm text-[var(--app-ink-2)]">Se crean en Convocatorias › Nueva convocatoria, eligiendo «Apoyo en especie».</p>
        </div>
      ) : (
        <>
          {opera && (
            <div className="seg-tabs" role="tablist" aria-label="Vista de clubes">
              {([['pendientes', 'Por revisar', Inbox], ['comite', 'Comité', Gavel], ['logistica', 'Logística', Truck], ['todos', 'Todos', Shapes]] as const).map(([k, l, Icono]) => (
                <button key={k} type="button" role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                  <Icono className="h-3.5 w-3.5" aria-hidden="true" />{l}
                </button>
              ))}
            </div>
          )}

          {opera && pestana === 'pendientes' && (
            <BandejaClubes vista="pendientes" hrefFicha={(id) => `/admin/clubes/${id}`} />
          )}

          {opera && pestana === 'comite' && (
            <div className="space-y-4">
              <label className="block max-w-xl">
                <span className="sr-only">Convocatoria</span>
                <select className="h-11 w-full" value={convId ?? ''} onChange={(e) => elegir(Number(e.target.value))}>
                  {convs.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              {convId && <ActaComite key={convId} convocatoriaId={convId} puedeSubir />}
              {convId && <BandejaClubes key={`c-${convId}`} vista="comite" convocatoriaId={convId} hrefFicha={(id) => `/admin/clubes/${id}`}
                vacio="Todavía no hay clubes aprobados en revisión" />}
            </div>
          )}

          {opera && pestana === 'logistica' && (
            <div className="space-y-4">
              <label className="block max-w-xl">
                <span className="sr-only">Convocatoria</span>
                <select className="h-11 w-full" value={convId ?? ''} onChange={(e) => elegir(Number(e.target.value))}>
                  {convs.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              {convId && <LogisticaConvocatoria key={`l-${convId}`} convocatoriaId={convId} />}
            </div>
          )}

          {(!opera || pestana === 'todos') && (<>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
            <label className="block">
              <span className="sr-only">Convocatoria</span>
              <select className="h-11 w-full" value={convId ?? ''} onChange={(e) => elegir(Number(e.target.value))}>
                {convs.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.clubes_count})</option>)}
              </select>
            </label>
            <label className="relative block">
              <span className="sr-only">Buscar club, folio o escuela</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-ink-2)]" aria-hidden="true" />
              <input className="auth-input auth-input-static !pl-9" maxLength={120} value={busqueda} placeholder="Club, folio, escuela o CCT" onChange={(e) => setBusqueda(e.target.value)} />
            </label>
            <select aria-label="Estado" className="h-11" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_CLUB).map(([v, x]) => <option key={v} value={v}>{x.etiqueta}</option>)}
            </select>
          </div>

          {actual && (
            <p className="text-sm text-[var(--app-ink-2)]">
              {actual.clubes_count} clubes registrados · {actual.enviados_count} enviados a revisión
              {actual.fecha_cierre ? ` · registro hasta el ${formatDate(actual.fecha_cierre)}` : ''}
            </p>
          )}

          <div className="pastel-frame" aria-busy={cargando}>
            {cargando ? (
              <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
            ) : clubes.length === 0 ? (
              <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
                <span className="tone-chip" data-tone="sky"><Users aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">{q || estado ? 'Ningún club coincide' : 'Todavía no hay clubes'}</p>
                <p className="text-sm text-[var(--app-ink-2)]">{q || estado ? 'Prueba con otra búsqueda o quita el filtro.' : 'Aparecerán aquí cuando los líderes registren su club.'}</p>
              </div>
            ) : (
              <ul className="data-grid grid grid-cols-1 gap-3 xl:grid-cols-2">
                {clubes.map((c) => {
                  const est = ESTADO_CLUB[c.estado] ?? { etiqueta: c.estado, tono: 'neutral' };
                  return (
                    <li key={c.id}>
                      <Link href={`/admin/clubes/${c.id}`} className="app-card data-card flex items-center gap-3 p-4 transition-transform active:scale-[0.99]">
                        <FotoClub src={c.logo_url} fallback={<Shapes className="h-5 w-5 text-[var(--app-ink-2)]" aria-hidden="true" />} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="break-words font-semibold text-[var(--app-ink)]">{c.nombre}</span>
                            <span className="pill" data-tone={est.tono}>{est.etiqueta}</span>
                          </span>
                          <span className="block text-xs text-[var(--app-ink-2)]">
                            <Folio folio={c.folio} corto={c.convocatoria_corto} /> · {c.integrantes_count} integrantes{c.lider ? ` · ${c.lider.name}` : ''}
                          </span>
                          {c.escuela && (
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-[var(--app-ink-2)]">
                              <School className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{c.escuela.nombre} · {c.escuela.municipio} · {SISTEMA_ESCUELA[c.escuela.sistema] ?? c.escuela.sistema}</span>
                            </span>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-ink-2)]" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          </>)}
        </>
      )}
    </div>
  );
}
