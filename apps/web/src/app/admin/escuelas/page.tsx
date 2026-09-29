'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { School, Loader2, Pencil, Plus, Upload, Download, Search, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import { Button } from '@/components/ui/button';
import { NIVEL_ESCUELA, SISTEMA_ESCUELA } from '@/lib/especie';

interface Escuela { id: number; cct: string; nombre: string; municipio: string; nivel: string; sistema: string; activo: boolean }
interface Pagina { data: Escuela[]; current_page: number; last_page: number; total: number }
interface ResultadoImportacion { creadas: number; actualizadas: number; errores: { fila: number; cct: string; problemas: string[] }[] }

const VACIO = { cct: '', nombre: '', municipio: '', nivel: 'primaria', sistema: 'estatal' };
const PATRON_CCT = /^15[A-Z]{3}\d{4}[A-Z]$/;
const inputCls = 'auth-input auth-input-static pl-4';

function err(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || def;
}

/** El servidor devuelve la página paginada de Laravel; se valida la forma antes de pintarla. */
function leerPagina(d: unknown): Pagina {
  const o = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
  const data = Array.isArray(o.data) ? (o.data as Escuela[]).filter((e) => e && typeof e.id === 'number' && typeof e.cct === 'string') : [];
  const n = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  return { data, current_page: n(o.current_page, 1), last_page: n(o.last_page, 1), total: n(o.total, data.length) };
}

/**
 * E52 · F1 — Catálogo de escuelas para "Apoyo en especie" (solo admin). Alta una por una o por Excel con la plantilla.
 * El sistema (estatal/federal) decide después si al club le aplica transporte y box lunch.
 */
export default function EscuelasPage() {
  const [pagina, setPagina] = useState<Pagina>({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ q: '', nivel: '', sistema: '', activo: '' });
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState<Escuela | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

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
    const cct = form.cct.trim().toUpperCase();
    if (!PATRON_CCT.test(cct)) { setAviso({ tipo: 'error', texto: 'La CCT debe ser del Estado de México: 15 + 3 letras + 4 números + 1 letra (p. ej. 15EPR0001A).' }); return; }
    if (form.nombre.trim().length < 3) { setAviso({ tipo: 'error', texto: 'Escribe el nombre de la escuela.' }); return; }
    if (!form.municipio.trim()) { setAviso({ tipo: 'error', texto: 'Escribe el municipio.' }); return; }
    setGuardando(true);
    try {
      const cuerpo = { ...form, cct, nombre: form.nombre.trim(), municipio: form.municipio.trim(), activo: editando ? editando.activo : true };
      if (editando) await api.put(`/admin/escuelas/${editando.id}`, cuerpo);
      else await api.post('/admin/escuelas', cuerpo);
      setAviso({ tipo: 'success', texto: editando ? 'Escuela actualizada.' : 'Escuela agregada al catálogo.' });
      setForm(VACIO);
      setEditando(null);
      void cargar();
    } catch (er) {
      setAviso({ tipo: 'error', texto: err(er, 'No se pudo guardar la escuela.') });
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

  return (
    <div className="space-y-8">
      <PageHeader title="Escuelas" eyebrow="Apoyo en especie"
        description="Catálogo del que los líderes eligen la escuela de su club. El sistema (estatal o federal) decide si aplica transporte y box lunch."
        icon={<School className="h-5 w-5" />} />
      {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="perfil-tarjeta space-y-4" aria-labelledby="esc-importar">
            <h2 id="esc-importar" className="perfil-tarjeta-titulo"><FileSpreadsheet aria-hidden="true" />Cargar desde Excel</h2>
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

          <form onSubmit={guardar} className="perfil-tarjeta space-y-4" noValidate>
            <h2 className="perfil-tarjeta-titulo">{editando ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}{editando ? 'Editar escuela' : 'Agregar una escuela'}</h2>
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
            <div className="flex gap-2">
              <Button type="submit" disabled={guardando}>{guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{editando ? 'Guardar cambios' : 'Agregar escuela'}</Button>
              {editando && <Button type="button" variant="outline" onClick={() => { setEditando(null); setForm(VACIO); }}>Cancelar</Button>}
            </div>
          </form>
        </div>

        <section className="space-y-4" aria-busy={cargando}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <label className="relative block">
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
                <p className="font-bold text-[var(--app-ink)]">{filtros.q || filtros.nivel || filtros.sistema || filtros.activo ? 'Ninguna escuela coincide' : 'El catálogo está vacío'}</p>
                <p className="text-sm text-[var(--app-ink-2)]">{filtros.q || filtros.nivel || filtros.sistema || filtros.activo ? 'Prueba con otra búsqueda o quita los filtros.' : 'Carga el Excel con la plantilla o agrega la primera escuela.'}</p>
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
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="soft" aria-label={`Editar ${x.nombre}`} onClick={() => { setEditando(x); setForm({ cct: x.cct, nombre: x.nombre, municipio: x.municipio, nivel: x.nivel, sistema: x.sistema }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
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
