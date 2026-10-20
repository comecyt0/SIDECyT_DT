'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, CheckCircle2, Globe, Loader2, Search, XCircle, Hourglass, Layers, Eye, FileDown, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import PaginationControls from '@/components/ui/pagination-controls';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { UserChip } from '@/components/ui/user-avatar';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';
import { formatDate } from '@/lib/format';
import { useRol } from '@/hooks/useRol';
import { ESTADO_CLUB } from '@/lib/especie';
import VistaPreviaFolio from '@/components/admin/folios/VistaPreviaFolio';
import { descargarExportacionFolios } from '@/lib/folios-api';

type Grupo = 'aprobados' | 'no_aprobados' | 'en_proceso' | 'todos';

interface Folio {
  /** E80: los clubes de Apoyo en especie también son folios. */
  tipo?: 'solicitud' | 'club';
  id: number;
  folio: string;
  titulo_proyecto: string;
  estado: string;
  updated_at: string;
  user_id: number;
  publicado_en_landing?: boolean;
  /** E81: clave única (solicitud-3 / club-7) y, en clubes, si la escuela es nueva o ya participó. */
  clave?: string;
  escuela_nueva?: boolean | null;
  integrantes?: number | null;
  user?: { id: number; name: string; avatar_url?: string | null } | null;
  empresa?: { nombre: string } | null;
  convocatoria?: { id: number; nombre: string; periodo?: { nombre: string } | null } | null;
}

interface Publicacion {
  convocatoria: { id: number; nombre: string };
  aprobados: { tipo?: 'solicitud' | 'club'; id: number; folio: string; estado: string }[];
  publicados: { solicitud_id: number | null; club_id?: number | null; folio: string; publicado_at: string }[];
  pendientes_de_publicar: { id: number; folio: string }[];
  publicado_at: string | null;
}

const PESTANAS: { key: Grupo; label: string; icon: typeof Award }[] = [
  { key: 'aprobados', label: 'Aprobados', icon: CheckCircle2 },
  { key: 'no_aprobados', label: 'No aprobados', icon: XCircle },
  { key: 'en_proceso', label: 'En proceso', icon: Hourglass },
  { key: 'todos', label: 'Todos', icon: Layers },
];

function mensaje(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || def;
}

/**
 * E45 (punto 4) — Histórico y seguimiento de folios aprobados / no aprobados, y publicación en la landing.
 * El backend aplica el alcance (admin de convocatoria y consulta solo ven lo suyo). Publicar: admin y admin de
 * convocatoria, con confirmación explícita.
 */
export default function FoliosPage() {
  const { puedeOperar } = useRol();
  const [grupo, setGrupo] = useState<Grupo>('aprobados');
  const [convocatoriaId, setConvocatoriaId] = useState('');
  const [periodoId, setPeriodoId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [datos, setDatos] = useState<{ items: Folio[]; total: number; last: number; conteos: Record<Grupo, number> } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [convocatorias, setConvocatorias] = useState<{ id: number; nombre: string }[]>([]);
  const [periodos, setPeriodos] = useState<{ id: number; nombre: string }[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  // E81: selección para exportación parcial, vista previa y exportando.
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [vista, setVista] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  // Publicación
  const [pubConvId, setPubConvId] = useState('');
  const [pub, setPub] = useState<Publicacion | null>(null);
  const [revisado, setRevisado] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [confirmarRetiro, setConfirmarRetiro] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/admin/convocatorias').catch(() => ({ data: [] })),
      api.get('/admin/periodos').catch(() => ({ data: [] })),
    ]).then(([c, p]) => {
      setConvocatorias(Array.isArray(c.data) ? c.data.map((x: { id: number; nombre: string }) => ({ id: x.id, nombre: x.nombre })) : []);
      setPeriodos(Array.isArray(p.data) ? p.data.map((x: { id: number; nombre: string }) => ({ id: x.id, nombre: x.nombre })) : []);
    });
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/admin/folios', {
        params: { grupo, convocatoria_id: convocatoriaId || undefined, periodo_id: periodoId || undefined, search: busqueda.trim() || undefined, page: pagina, per_page: perPage },
      });
      const f = data?.folios ?? {};
      setDatos({
        items: Array.isArray(f.data) ? f.data : [],
        total: Number(f.total ?? 0),
        last: Number(f.last_page ?? 1),
        conteos: { aprobados: 0, no_aprobados: 0, en_proceso: 0, todos: 0, ...(data?.conteos ?? {}) },
      });
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensaje(e, 'No se pudo cargar el histórico.') });
    } finally {
      setCargando(false);
    }
  }, [grupo, convocatoriaId, periodoId, busqueda, pagina, perPage]);

  useEffect(() => {
    const t = setTimeout(() => { void cargar(); }, busqueda ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, busqueda]);

  const cargarPublicacion = useCallback(async (id: string) => {
    setPub(null);
    setRevisado(false);
    if (!id) return;
    try {
      const { data } = await api.get(`/admin/convocatorias/${id}/folios-publicados`);
      setPub(data as Publicacion);
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensaje(e, 'No se pudo cargar la publicación.') });
    }
  }, []);

  const publicar = async () => {
    if (!pub || !revisado) return;
    setTrabajando(true);
    try {
      const { data } = await api.post(`/admin/convocatorias/${pub.convocatoria.id}/folios-publicados`, { confirmar: true });
      setAviso({ tipo: 'success', texto: data?.message ?? 'Folios publicados.' });
      await cargarPublicacion(String(pub.convocatoria.id));
      void cargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensaje(e, 'No se pudo publicar.') });
    } finally {
      setTrabajando(false);
    }
  };

  // E81: exportación completa (lo que muestran los filtros) o parcial (los marcados), en PDF o Excel.
  const exportar = async (formato: 'pdf' | 'xlsx', modo: 'completo' | 'parcial') => {
    setExportando(`${modo}-${formato}`);
    try {
      await descargarExportacionFolios({
        formato, modo, ids: modo === 'parcial' ? [...seleccion] : undefined,
        grupo, convocatoria_id: convocatoriaId || undefined, periodo_id: periodoId || undefined, search: busqueda.trim() || undefined,
      }, modo === 'completo' ? `folios-${grupo}` : `folios-seleccion-${seleccion.size}`);
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensaje(e, 'No se pudo exportar. Revisa los filtros e inténtalo de nuevo.') });
    } finally {
      setExportando(null);
    }
  };
  const claveDe = (f: Folio) => f.clave ?? `${f.tipo ?? 'solicitud'}-${f.id}`;
  const alternar = (k: string) => setSeleccion((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const paginaSeleccionada = !!datos?.items.length && datos.items.every((f) => seleccion.has(claveDe(f)));

  const retirar = async () => {
    if (!pub) return;
    setConfirmarRetiro(false);
    setTrabajando(true);
    try {
      const { data } = await api.delete(`/admin/convocatorias/${pub.convocatoria.id}/folios-publicados`);
      setAviso({ tipo: 'success', texto: data?.message ?? 'Folios retirados.' });
      await cargarPublicacion(String(pub.convocatoria.id));
      void cargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensaje(e, 'No se pudieron retirar.') });
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Folios"
        description="Histórico y seguimiento de folios aprobados y no aprobados. Los aprobados se publican en la página pública solo cuando lo confirmas."
        icon={<Award className="h-5 w-5" />}
      />

      {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="seg-tabs" role="tablist" aria-label="Grupo de folios">
          {PESTANAS.map((p) => (
            <button key={p.key} type="button" role="tab" aria-selected={grupo === p.key}
              onClick={() => { setGrupo(p.key); setPagina(1); }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
              <p.icon className="h-3.5 w-3.5" aria-hidden="true" />{p.label}
              <span className="text-xs opacity-70">{datos?.conteos[p.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <select aria-label="Convocatoria" value={convocatoriaId} onChange={(e) => { setConvocatoriaId(e.target.value); setPagina(1); }} className="h-11 max-w-full">
            <option value="">Todas las convocatorias</option>
            {convocatorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select aria-label="Periodo" value={periodoId} onChange={(e) => { setPeriodoId(e.target.value); setPagina(1); }} className="h-11">
            <option value="">Todos los periodos</option>
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-ink-2)]" aria-hidden="true" />
            <input type="search" aria-label="Buscar folio o proyecto" placeholder="Buscar folio o proyecto" maxLength={100}
              className="auth-input auth-input-static pl-10" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
          </div>
        </div>
      </div>

      {/* E81: exportar (completo = lo que muestran los filtros; parcial = los marcados) */}
      <div className="flex flex-wrap items-center gap-2 rounded-[16px] border px-4 py-3" style={{ borderColor: 'var(--app-rule)', backgroundColor: 'var(--app-card-bg)' }} role="toolbar" aria-label="Exportar folios">
        <span className="mr-1 text-sm font-semibold text-[var(--app-ink)]">Exportar</span>
        {seleccion.size > 0 ? (
          <>
            <span className="pill" data-tone="sky">{seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'}</span>
            <Button size="sm" variant="soft" disabled={exportando !== null} onClick={() => void exportar('pdf', 'parcial')}>
              {exportando === 'parcial-pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}PDF de la selección
            </Button>
            <Button size="sm" variant="soft" disabled={exportando !== null} onClick={() => void exportar('xlsx', 'parcial')}>
              {exportando === 'parcial-xlsx' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}Excel de la selección
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSeleccion(new Set())}>Quitar selección</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="soft" disabled={exportando !== null || !datos?.total} onClick={() => void exportar('pdf', 'completo')}>
              {exportando === 'completo-pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}PDF completo
            </Button>
            <Button size="sm" variant="soft" disabled={exportando !== null || !datos?.total} onClick={() => void exportar('xlsx', 'completo')}>
              {exportando === 'completo-xlsx' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}Excel completo
            </Button>
            <span className="text-xs text-[var(--app-ink-2)]">Con los filtros de arriba. Marca folios para exportar solo esos, o abre uno para exportarlo solo.</span>
          </>
        )}
        {!!datos?.items.length && (
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--app-ink)]">
            <input type="checkbox" className="h-4 w-4 accent-[var(--sg-vino)]" checked={paginaSeleccionada}
              onChange={(e) => setSeleccion((s) => { const n = new Set(s); for (const f of datos.items) { if (e.target.checked) n.add(claveDe(f)); else n.delete(claveDe(f)); } return n; })} />
            Marcar esta página
          </label>
        )}
      </div>

      {/* Lista */}
      <section className="pastel-frame" aria-busy={cargando}>
        {cargando && !datos ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[var(--app-ink-2)]" aria-label="Cargando" /></div>
        ) : datos && datos.items.length === 0 ? (
          <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
            <span className="tone-chip" data-tone="sky"><Award aria-hidden="true" /></span>
            <p className="font-bold text-[var(--app-ink)]">No hay folios en este grupo</p>
            <p className="text-sm text-[var(--app-ink-2)]">Cambia de pestaña o de filtros.</p>
          </div>
        ) : (
          <div className="data-grid grid grid-cols-1 gap-4 md:grid-cols-2">
            {datos?.items.map((f) => {
              const esClub = f.tipo === 'club';
              const estClub = esClub ? ESTADO_CLUB[f.estado] : undefined;
              return (
              <article key={claveDe(f)} className="app-card data-card relative p-5" style={seleccion.has(claveDe(f)) ? { boxShadow: 'inset 0 0 0 2px var(--sg-vino)' } : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <input type="checkbox" className="mt-2.5 h-4 w-4 shrink-0 accent-[var(--sg-vino)]" checked={seleccion.has(claveDe(f))}
                    onChange={() => alternar(claveDe(f))} aria-label={`Marcar el folio ${f.folio} para exportar`} />
                  <UserChip user={f.user} sub={f.empresa?.nombre ?? null} href={esClub ? `/admin/clubes/${f.id}` : `/admin/perfiles/${f.user_id}?folio=${f.id}`} size="md" />
                  {esClub
                    ? <span className="pill shrink-0" data-tone={estClub?.tono ?? 'neutral'} data-dot="on">{estClub?.etiqueta ?? f.estado}</span>
                    : <span className={`shrink-0 ${estadoBadgeClass(f.estado)}`}>{estadoLabel(f.estado)}</span>}
                </div>
                <p className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs font-bold tracking-wide text-[var(--sg-vino)]">
                  {f.folio}{esClub && <span className="pill font-sans" data-tone="sky">Club</span>}
                </p>
                <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-[var(--app-ink)]">{f.titulo_proyecto}</h3>
                <p className="mt-1 text-xs text-[var(--app-ink-2)]">
                  {f.convocatoria?.nombre ?? '—'}{f.convocatoria?.periodo?.nombre ? ` · ${f.convocatoria.periodo.nombre}` : ''} · actualizado {formatDate(f.updated_at)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {/* 08/10/2026 (acuerdo con el usuario): identificador de escuela donde aparezca */}
                  {esClub && f.escuela_nueva !== null && f.escuela_nueva !== undefined && (
                    <span className="pill" data-tone={f.escuela_nueva ? 'mint' : 'gold'}>{f.escuela_nueva ? 'Nueva escuela' : 'Ya participó'}</span>
                  )}
                  {esClub && typeof f.integrantes === 'number' && <span className="pill" data-tone="neutral">{f.integrantes} integrante{f.integrantes === 1 ? '' : 's'}</span>}
                  {f.publicado_en_landing && (
                    <span className="pill inline-flex items-center gap-1" data-tone="emerald"><Globe className="h-3 w-3" aria-hidden="true" />En la página pública</span>
                  )}
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => setVista(claveDe(f))} aria-label={`Vista previa del folio ${f.folio}`}>
                    <Eye className="h-4 w-4" aria-hidden="true" />Vista previa
                  </Button>
                </div>
              </article>
              );
            })}
          </div>
        )}
        {datos && datos.total > 0 && (
          <PaginationControls currentPage={pagina} lastPage={datos.last} total={datos.total} perPage={perPage}
            onPageChange={setPagina} onPerPageChange={(n) => { setPerPage(n); setPagina(1); }} />
        )}
      </section>

      {/* Publicación en la landing */}
      {puedeOperar && (
        <section className="perfil-tarjeta space-y-4" aria-labelledby="pub-titulo">
          <h2 id="pub-titulo" className="perfil-tarjeta-titulo"><Globe aria-hidden="true" />Publicar folios aprobados en la página pública</h2>
          <p className="text-sm text-[var(--app-ink-2)]">
            Solo se muestra el número de folio, agrupado por convocatoria. Revisa la lista y confirma. Si después se aprueban más
            folios, vuelve a publicar.
          </p>
          <select aria-label="Convocatoria a publicar" value={pubConvId} onChange={(e) => { setPubConvId(e.target.value); void cargarPublicacion(e.target.value); }} className="h-11 max-w-full">
            <option value="">Elige una convocatoria…</option>
            {convocatorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {pub && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="pill" data-tone="emerald">{pub.aprobados.length} aprobados</span>
                <span className="pill" data-tone="sky">{pub.publicados.length} publicados</span>
                {pub.pendientes_de_publicar.length > 0 && <span className="pill" data-tone="amber">{pub.pendientes_de_publicar.length} sin publicar</span>}
                {pub.publicado_at && <span className="text-xs text-[var(--app-ink-2)] self-center">Última publicación: {formatDate(pub.publicado_at)}</span>}
              </div>
              {pub.aprobados.length > 0 ? (
                <ul className="flex flex-wrap gap-2" aria-label="Folios que se publicarán">
                  {pub.aprobados.map((a) => (
                    <li key={`${a.tipo ?? 'solicitud'}-${a.id}`} className="rounded-full bg-[var(--sg-canvas)] px-3 py-1 font-mono text-xs font-semibold text-[var(--app-ink)]">{a.folio}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--app-ink-2)]">Esta convocatoria aún no tiene folios aprobados.</p>
              )}
              <label className="flex items-start gap-2 text-sm text-[var(--app-ink)]">
                <input type="checkbox" className="mt-1" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} disabled={pub.aprobados.length === 0} />
                Revisé la lista y confirmo publicar estos folios en la página pública.
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={publicar} disabled={!revisado || trabajando || pub.aprobados.length === 0}>
                  {trabajando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Globe className="h-4 w-4" aria-hidden="true" />}
                  {pub.publicados.length > 0 ? 'Actualizar publicación' : 'Publicar folios'}
                </Button>
                {pub.publicados.length > 0 && (
                  <Button variant="destructive" onClick={() => setConfirmarRetiro(true)} disabled={trabajando}>Retirar de la página pública</Button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <VistaPreviaFolio clave={vista} onCerrar={() => setVista(null)} />

      <ConfirmDialog
        open={confirmarRetiro}
        title="Retirar folios de la página pública"
        description="Los folios de esta convocatoria dejarán de mostrarse en la página pública. Puedes volver a publicarlos después."
        confirmLabel="Retirar"
        variant="destructive"
        onConfirm={retirar}
        onCancel={() => setConfirmarRetiro(false)}
      />
    </div>
  );
}
