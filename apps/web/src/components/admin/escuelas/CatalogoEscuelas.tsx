'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { School, Loader2, Pencil, Plus, Upload, Download, Search, ChevronLeft, ChevronRight, FileSpreadsheet, History } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NIVEL_ESCUELA, SISTEMA_ESCUELA } from '@/lib/especie';
import TemporadasInput, { normalizarTemporadas } from '@/components/admin/escuelas/TemporadasInput';

interface Escuela {
  id: number; cct: string; nombre: string; municipio: string; nivel: string; sistema: string; activo: boolean;
  participo_antes: boolean; temporadas: string[];
  /** E84: folios de los clubes de la escuela con su estado. */
  clubes?: { id: number; folio: string; estado: string; estado_texto: string; grupo: string; convocatoria: string | null }[];
}
const TONO_GRUPO: Record<string, string> = { aprobados: 'emerald', no_aprobados: 'red', en_proceso: 'violet' };
interface Pagina { data: Escuela[]; current_page: number; last_page: number; total: number }
interface ResultadoImportacion { creadas: number; actualizadas: number; errores: { fila: number; cct: string; problemas: string[] }[] }

const VACIO = { cct: '', nombre: '', municipio: '', nivel: 'primaria', sistema: 'estatal', participo_antes: false, temporadas: [] as string[] };
const PATRON_CCT = /^15[A-Z]{3}\d{4}[A-Z]$/;
const inputCls = 'auth-input auth-input-static pl-4';

function err(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || def;
}

/** El servidor devuelve la página paginada de Laravel; se valida la forma antes de pintarla. */
function leerPagina(d: unknown): Pagina {
  const o = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
  const data = Array.isArray(o.data)
    ? (o.data as Record<string, unknown>[]).filter((e) => e && typeof e.id === 'number' && typeof e.cct === 'string')
      .map((e) => ({ ...(e as unknown as Escuela), participo_antes: e.participo_antes === true, temporadas: normalizarTemporadas(e.temporadas) }))
    : [];
  const n = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  return { data, current_page: n(o.current_page, 1), last_page: n(o.last_page, 1), total: n(o.total, data.length) };
}

/**
 * E52 · F1 — Catálogo de escuelas para "Apoyo en especie" (solo admin). Alta una por una o por Excel con la plantilla.
 * El sistema (estatal/federal) decide después si al club le aplica transporte y box lunch.
 * E55: marca «Ya ha participado» con las temporadas que escribe el admin, como identificador de la escuela.
 */
export default function CatalogoEscuelas() {
  const [pagina, setPagina] = useState<Pagina>({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ q: '', nivel: '', sistema: '', activo: '', participo: '' });
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState<Escuela | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [errTemporadas, setErrTemporadas] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<'agregar' | 'excel' | null>(null);
  const cerrarModal = () => { setModal(null); setEditando(null); setForm(VACIO); setErrTemporadas(null); };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 25 };
      for (const [k, v] of Object.entries(filtros)) if (v) params[k] = v;
      const { data } = await api.get('/admin/escuelas', { params });
      setPagina(leerPagina(data));
    } catch (e) {
      setAviso({ tipo: 'error', texto: err(e, 'No se pudo cargar el catálogo de escuelas.') });
    } finally {
      setCargando(false);
    }
  }, [page, filtros]);
  useEffect(() => { void cargar(); }, [cargar]);

  // La búsqueda por texto espera a que se deje de escribir.
  useEffect(() => {
    const t = window.setTimeout(() => { setPage(1); setFiltros((f) => (f.q === busqueda.trim() ? f : { ...f, q: busqueda.trim() })); }, 400);
    return () => window.clearTimeout(t);
  }, [busqueda]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrTemporadas(null);
    const cct = form.cct.trim().toUpperCase();
    if (!PATRON_CCT.test(cct)) { setAviso({ tipo: 'error', texto: 'La CCT debe ser del Estado de México: 15 + 3 letras + 4 números + 1 letra (p. ej. 15EPR0001A).' }); return; }
    if (form.nombre.trim().length < 3) { setAviso({ tipo: 'error', texto: 'Escribe el nombre de la escuela.' }); return; }
    if (!form.municipio.trim()) { setAviso({ tipo: 'error', texto: 'Escribe el municipio.' }); return; }
    if (form.participo_antes && form.temporadas.length === 0) { setErrTemporadas('Escribe al menos una temporada en la que participó la escuela.'); return; }
    setGuardando(true);
    try {
      const cuerpo = { ...form, cct, nombre: form.nombre.trim(), municipio: form.municipio.trim(), activo: editando ? editando.activo : true,
        temporadas: form.participo_antes ? form.temporadas : [] };
      if (editando) await api.put(`/admin/escuelas/${editando.id}`, cuerpo);
      else await api.post('/admin/escuelas', cuerpo);
      setAviso({ tipo: 'success', texto: editando ? 'Escuela actualizada.' : 'Escuela agregada al catálogo.' });
      setForm(VACIO);
      setEditando(null);
      setModal(null);
      void cargar();
    } catch (er) {
      const t = err(er, 'No se pudo guardar la escuela.');
      if (/temporada/i.test(t)) setErrTemporadas(t); else setAviso({ tipo: 'error', texto: t });
    } finally {
      setGuardando(false);
    }
  };

  const alternarActiva = async (x: Escuela) => {
    try {
      await api.put(`/admin/escuelas/${x.id}`, { cct: x.cct, nombre: x.nombre, municipio: x.municipio, nivel: x.nivel, sistema: x.sistema, activo: !x.activo });
      setAviso({ tipo: 'success', texto: x.activo ? `«${x.nombre}» ya no aparece para registrar clubes.` : `«${x.nombre}» vuelve a estar disponible.` });
      void cargar();
    } catch (er) {
      setAviso({ tipo: 'error', texto: err(er, 'No se pudo cambiar la escuela.') });
    }
  };

  const descargarPlantilla = async () => {
    try {
      const r = await api.get('/admin/escuelas/plantilla', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_escuelas_sidecyt.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo descargar la plantilla.' });
    }
  };

  const importar = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) { setAviso({ tipo: 'error', texto: 'Sube el Excel en formato .xlsx (usa la plantilla).' }); return; }
    if (f.size > 5 * 1024 * 1024) { setAviso({ tipo: 'error', texto: 'El archivo pasa de 5 MB.' }); return; }
    setImportando(true);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append('archivo', f);
      // E32: sin Content-Type propio, el navegador arma el multipart con su boundary.
      const { data } = await api.post('/admin/escuelas/importar', fd, { headers: { 'Content-Type': undefined } });
      const r: ResultadoImportacion = {
        creadas: Number(data?.creadas) || 0,
        actualizadas: Number(data?.actualizadas) || 0,
        errores: Array.isArray(data?.errores) ? data.errores.slice(0, 200) : [],
      };
      setResultado(r);
      setPage(1);
      void cargar();
    } catch (er) {
      setAviso({ tipo: 'error', texto: err(er, 'No se pudo importar el Excel.') });
    } finally {
      setImportando(false);
      if (archivoRef.current) archivoRef.current.value = '';
    }
  };

  const hayFiltros = Boolean(filtros.q || filtros.nivel || filtros.sistema || filtros.activo || filtros.participo);

  return (
    <div className="space-y-6">
      {aviso && !modal && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}

      {/* E84 (20/10/2026, pedido del usuario): «Agregar escuela» y «Cargar desde Excel» se abren en una ventana desde su botón. */}
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Acciones del catálogo">
        <Button type="button" onClick={() => { setEditando(null); setForm(VACIO); setErrTemporadas(null); setAviso(null); setModal('agregar'); }}><Plus className="h-4 w-4" aria-hidden="true" />Agregar escuela</Button>
        <Button type="button" variant="outline" onClick={() => { setResultado(null); setAviso(null); setModal('excel'); }}><FileSpreadsheet className="h-4 w-4" aria-hidden="true" />Cargar desde Excel</Button>
      </div>

      <Dialog open={modal === 'excel'} onOpenChange={(o) => { if (!o) cerrarModal(); }}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
          {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}
          <section className="space-y-4" aria-labelledby="esc-importar">
            <DialogTitle id="esc-importar" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><FileSpreadsheet className="h-5 w-5" aria-hidden="true" />Cargar desde Excel</DialogTitle>
            <p className="text-sm text-[var(--app-ink-2)]">
              Descarga la plantilla, llena una escuela por fila y súbela. Si la CCT ya existe se actualiza; las filas con error se listan abajo y no se cargan.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={descargarPlantilla}><Download className="h-4 w-4" aria-hidden="true" />Plantilla</Button>
              <Button type="button" onClick={() => archivoRef.current?.click()} disabled={importando}>
                {importando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                {importando ? 'Importando…' : 'Subir Excel'}
              </Button>
              <input ref={archivoRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
                aria-label="Archivo de Excel con escuelas" onChange={(e) => void importar(e.target.files?.[0])} />
            </div>
            {resultado && (
              <div role="status" className="space-y-2 rounded-[14px] border px-4 py-3 text-sm" style={{ borderColor: 'var(--app-rule)', backgroundColor: 'var(--auth-field)' }}>
                <p className="font-semibold text-[var(--app-ink)]">
                  {resultado.creadas} nuevas · {resultado.actualizadas} actualizadas{resultado.errores.length ? ` · ${resultado.errores.length} con error` : ''}
                </p>
                {resultado.errores.length > 0 && (
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-[var(--app-ink-2)]">
                    {resultado.errores.map((x) => (
                      <li key={`${x.fila}-${x.cct}`}>Fila {x.fila}{x.cct ? ` (${x.cct})` : ''}: {Array.isArray(x.problemas) ? x.problemas.join(', ') : ''}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>


        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'agregar'} onOpenChange={(o) => { if (!o) cerrarModal(); }}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
          {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}
          <form onSubmit={guardar} className="space-y-4" noValidate>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]">{editando ? <Pencil className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}{editando ? 'Editar escuela' : 'Agregar una escuela'}</DialogTitle>
            <label className="perfil-campo"><span>CCT</span>
              <input className={`${inputCls} uppercase`} maxLength={10} value={form.cct} placeholder="15EPR0001A"
                onChange={(e) => setForm({ ...form, cct: e.target.value.toUpperCase() })} required />
            </label>
            <label className="perfil-campo"><span>Nombre</span>
              <input className={inputCls} maxLength={255} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label className="perfil-campo"><span>Municipio</span>
              <input className={inputCls} maxLength={120} value={form.municipio} placeholder="Toluca" onChange={(e) => setForm({ ...form, municipio: e.target.value })} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="perfil-campo"><span>Nivel</span>
                <select className={inputCls} value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
                  {Object.entries(NIVEL_ESCUELA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </label>
              <label className="perfil-campo"><span>Sistema</span>
                <select className={inputCls} value={form.sistema} onChange={(e) => setForm({ ...form, sistema: e.target.value })}>
                  {Object.entries(SISTEMA_ESCUELA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </label>
            </div>
            {/* E55: participación previa como identificador */}
            <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3" style={{ borderColor: 'var(--app-rule)', backgroundColor: form.participo_antes ? 'var(--tile-gold-bg)' : 'transparent' }}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--auth-vino)]" checked={form.participo_antes}
                onChange={(e) => { setErrTemporadas(null); setForm({ ...form, participo_antes: e.target.checked }); }} />
              <span><span className="block text-sm font-semibold text-[var(--app-ink)]">Ya ha participado anteriormente</span>
                <span className="block text-xs text-[var(--app-ink-2)]">Queda como identificador de la escuela, con las temporadas en que participó.</span></span>
            </label>
            {form.participo_antes && <TemporadasInput value={form.temporadas} onChange={(t) => { setErrTemporadas(null); setForm({ ...form, temporadas: t }); }} error={errTemporadas} />}
            <div className="flex gap-2">
              <Button type="submit" disabled={guardando}>{guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{editando ? 'Guardar cambios' : 'Agregar escuela'}</Button>
              <Button type="button" variant="outline" onClick={cerrarModal}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div>
        <section className="space-y-4" aria-busy={cargando}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
            <label className="relative block sm:col-span-2 xl:col-span-1">
              <span className="sr-only">Buscar por nombre, CCT o municipio</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-ink-2)]" aria-hidden="true" />
              <input className={`${inputCls} !pl-9`} value={busqueda} maxLength={120} placeholder="Nombre, CCT o municipio" onChange={(e) => setBusqueda(e.target.value)} />
            </label>
            <select aria-label="Nivel" className="h-11" value={filtros.nivel} onChange={(e) => { setPage(1); setFiltros({ ...filtros, nivel: e.target.value }); }}>
              <option value="">Todos los niveles</option>
              {Object.entries(NIVEL_ESCUELA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            <select aria-label="Sistema" className="h-11" value={filtros.sistema} onChange={(e) => { setPage(1); setFiltros({ ...filtros, sistema: e.target.value }); }}>
              <option value="">Estatal y federal</option>
              {Object.entries(SISTEMA_ESCUELA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            <select aria-label="Participación anterior" className="h-11" value={filtros.participo} onChange={(e) => { setPage(1); setFiltros({ ...filtros, participo: e.target.value }); }}>
              <option value="">Con y sin participación</option>
              <option value="1">Ya participaron</option>
              <option value="0">Primera vez</option>
            </select>
            <select aria-label="Disponibilidad" className="h-11" value={filtros.activo} onChange={(e) => { setPage(1); setFiltros({ ...filtros, activo: e.target.value }); }}>
              <option value="">Activas e inactivas</option>
              <option value="1">Solo activas</option>
              <option value="0">Solo inactivas</option>
            </select>
          </div>

          <div className="pastel-frame">
            {cargando ? (
              <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
            ) : pagina.data.length === 0 ? (
              <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
                <span className="tone-chip" data-tone="sky"><School aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">{hayFiltros ? 'Ninguna escuela coincide' : 'El catálogo está vacío'}</p>
                <p className="text-sm text-[var(--app-ink-2)]">{hayFiltros ? 'Prueba con otra búsqueda o quita los filtros.' : 'Carga el Excel con la plantilla o agrega la primera escuela.'}</p>
              </div>
            ) : (
              <ul className="data-grid grid grid-cols-1 gap-3">
                {pagina.data.map((x) => (
                  <li key={x.id} className="app-card data-card flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-[var(--app-ink)]">
                        {x.nombre} {!x.activo && <span className="pill ml-1" data-tone="neutral">inactiva</span>}
                      </p>
                      <p className="text-xs text-[var(--app-ink-2)]">
                        <span className="font-mono">{x.cct}</span> · {x.municipio} · {NIVEL_ESCUELA[x.nivel] ?? x.nivel} · {SISTEMA_ESCUELA[x.sistema] ?? x.sistema}
                      </p>
                      {x.participo_antes && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 font-semibold text-[var(--app-ink)]"><History className="h-3.5 w-3.5" aria-hidden="true" />Ya participó:</span>
                          {x.temporadas.map((t) => <span key={t} className="pill" data-tone="gold">{t}</span>)}
                        </p>
                      )}
                      {/* E84 (pedido del usuario): folios de sus clubes con su estado; cada uno lleva a Folios. */}
                      {Array.isArray(x.clubes) && x.clubes.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-semibold text-[var(--app-ink)]">Folios:</span>
                          {x.clubes.map((c) => (
                            <Link key={c.id} href={`/admin/folios?search=${encodeURIComponent(c.folio)}`} className="pill hover:underline" data-tone={TONO_GRUPO[c.grupo] ?? 'neutral'}
                              title={c.convocatoria ?? undefined} aria-label={`Folio ${c.folio}: ${c.estado_texto}. Ver en Folios`}>
                              <span className="font-mono">{c.folio}</span> · {c.estado_texto}
                            </Link>
                          ))}
                          <Link href={`/admin/folios?escuela_id=${x.id}&escuela=${encodeURIComponent(x.nombre)}`} className="inline-flex items-center gap-1 font-semibold text-[var(--sg-vino)] hover:underline">
                            Ver en Folios<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="soft" aria-label={`Editar ${x.nombre}`} onClick={() => { setEditando(x); setErrTemporadas(null); setForm({ cct: x.cct, nombre: x.nombre, municipio: x.municipio, nivel: x.nivel, sistema: x.sistema, participo_antes: x.participo_antes, temporadas: x.temporadas }); setAviso(null); setModal('agregar'); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void alternarActiva(x)}>{x.activo ? 'Desactivar' : 'Activar'}</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pagina.last_page > 1 && (
            <nav className="flex items-center justify-between gap-3 text-sm text-[var(--app-ink-2)]" aria-label="Paginación">
              <span>{pagina.total} escuelas · página {pagina.current_page} de {pagina.last_page}</span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" disabled={page >= pagina.last_page} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></Button>
              </span>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
