'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Globe, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import IconoPrograma, { ETIQUETA_ICONO } from '@/components/portal/IconoPrograma';
import { ICONOS, TONOS, enlaceSeguro, type Icono, type Sistema, type Tono } from '@/lib/sitio';

interface Programa {
  id: number; sistema: Sistema; nombre: string; dirigido_a: string | null; resumen: string | null; correo: string | null;
  telefono: string | null; url_info: string | null; icono: Icono; tono: Tono; orden: number; activo: boolean;
}
type Pestana = 'sigae' | 'sicei' | 'sectores' | 'documentos';

const FORM_VACIO = { nombre: '', dirigido_a: '', resumen: '', correo: '', telefono: '', url_info: '', icono: 'lightbulb' as Icono, tono: 'sky' as Tono, activo: true };
const ETIQUETA_TONO: Record<Tono, string> = { sky: 'Cielo', mint: 'Menta', peach: 'Durazno' };

function err(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || def;
}

/**
 * E49 (25/09/2026) — Contenido público de SIDECyT. Todo lo que ven las landings sobre programas y convocatorias se
 * edita aquí (nada en el código): programas de SIGAE y SICEI, sectores estratégicos, documentos que se preparan y notas.
 * Solo admin general (ruta en el grupo "solo admin" y fuera de SUBRUTAS_POR_ROL de los demás roles).
 */
export default function ContenidoSitioPage() {
  const [pestana, setPestana] = useState<Pestana>('sigae');
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contenido público"
        description="Lo que ven las páginas públicas de SIDECyT: programas de SIGAE y SICEI, sectores estratégicos y documentos. Los cambios se publican en unos minutos."
        icon={<Globe className="h-5 w-5" />}
      />
      {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}
      <div className="seg-tabs" role="tablist" aria-label="Sección">
        {([['sigae', 'Programas SIGAE'], ['sicei', 'Programas SICEI'], ['sectores', 'Sectores'], ['documentos', 'Documentos y notas']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className="text-sm font-semibold">{l}</button>
        ))}
      </div>
      {(pestana === 'sigae' || pestana === 'sicei') && <Programas key={pestana} sistema={pestana} avisar={setAviso} />}
      {pestana === 'sectores' && <ListaTextos clave="sigae.sectores" titulo="Sectores estratégicos (SIGAE)" ayuda="Uno por línea. Se muestran en la landing de SIGAE, en «¿Tu proyecto encaja?»." max={60} largo={60} avisar={setAviso} />}
      {pestana === 'documentos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Documentos avisar={setAviso} />
          <ListaTextos clave="sigae.documentos_notas" titulo="Notas sobre los documentos" ayuda="Una por línea (p. ej. Reglas de Operación, garantías)." max={10} largo={300} avisar={setAviso} />
        </div>
      )}
    </div>
  );
}

type Avisar = (a: { tipo: 'success' | 'error'; texto: string } | null) => void;

function Programas({ sistema, avisar }: { sistema: Sistema; avisar: Avisar }) {
  const [lista, setLista] = useState<Programa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState<Programa | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/admin/programas-publicos', { params: { sistema } });
      setLista(Array.isArray(data) ? data : []);
    } catch (e) { avisar({ tipo: 'error', texto: err(e, 'No se pudieron cargar los programas.') }); } finally { setCargando(false); }
  }, [sistema, avisar]);
  useEffect(() => { void cargar(); }, [cargar]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nombre.trim().length < 3) { avisar({ tipo: 'error', texto: 'Escribe el nombre del programa.' }); return; }
    if (form.url_info.trim() && !enlaceSeguro(form.url_info)) { avisar({ tipo: 'error', texto: 'La página oficial debe ser un enlace https de comecyt.edomex.gob.mx.' }); return; }
    setGuardando(true);
    try {
      const cuerpo = {
        sistema, nombre: form.nombre.trim(), dirigido_a: form.dirigido_a.trim() || null, resumen: form.resumen.trim() || null,
        correo: form.correo.trim() || null, telefono: form.telefono.trim() || null, url_info: form.url_info.trim() || null,
        icono: form.icono, tono: form.tono, activo: form.activo,
      };
      if (editando) await api.put(`/admin/programas-publicos/${editando}`, cuerpo);
      else await api.post('/admin/programas-publicos', cuerpo);
      avisar({ tipo: 'success', texto: editando ? 'Programa actualizado.' : 'Programa agregado.' });
      setForm(FORM_VACIO); setEditando(null); void cargar();
    } catch (er) { avisar({ tipo: 'error', texto: err(er, 'No se pudo guardar.') }); } finally { setGuardando(false); }
  };

  const cambiarActivo = async (p: Programa) => {
    try { await api.put(`/admin/programas-publicos/${p.id}`, { activo: !p.activo }); void cargar(); }
    catch (er) { avisar({ tipo: 'error', texto: err(er, 'No se pudo cambiar.') }); }
  };

  const mover = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    const nueva = [...lista];
    [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
    setLista(nueva);
    try { await api.post('/admin/programas-publicos/orden', { sistema, ids: nueva.map((p) => p.id) }); }
    catch (er) { avisar({ tipo: 'error', texto: err(er, 'No se pudo guardar el orden.') }); void cargar(); }
  };

  const eliminar = async () => {
    if (!borrar) return;
    const p = borrar; setBorrar(null);
    try { await api.delete(`/admin/programas-publicos/${p.id}`); avisar({ tipo: 'success', texto: 'Programa eliminado.' }); void cargar(); }
    catch (er) { avisar({ tipo: 'error', texto: err(er, 'No se pudo eliminar.') }); }
  };

  const editar = (p: Programa) => {
    setEditando(p.id);
    setForm({ nombre: p.nombre, dirigido_a: p.dirigido_a ?? '', resumen: p.resumen ?? '', correo: p.correo ?? '', telefono: p.telefono ?? '', url_info: p.url_info ?? '', icono: p.icono, tono: p.tono, activo: p.activo });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activos = lista.filter((p) => p.activo).length;

  return (
    <>
      {sistema === 'sicei' && (
        <AlertBox type="info" message="SICEI está pendiente de definir: sus programas se cargaron desde comecyt.edomex.gob.mx (becas a estudiantes e impulso a la investigación) como inactivos. No se muestran en ninguna página hasta que actives cada uno." />
      )}
      {/* grid-cols-1 = minmax(0,1fr): sin columna explícita, la única pista crecía al ancho del texto truncado (1003 px en 375). */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <form onSubmit={guardar} className="perfil-tarjeta space-y-4" noValidate>
          <h2 className="perfil-tarjeta-titulo">{editando ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}{editando ? 'Editar programa' : `Nuevo programa ${sistema.toUpperCase()}`}</h2>
          <label className="perfil-campo"><span>Nombre del programa <Asterisco /></span>
            <input className="auth-input auth-input-static pl-4" maxLength={255} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </label>
          <label className="perfil-campo"><span>¿A quién va dirigido?</span>
            <input className="auth-input auth-input-static pl-4" maxLength={400} value={form.dirigido_a} onChange={(e) => setForm({ ...form, dirigido_a: e.target.value })} placeholder="Ej. MiPyMEs del Estado de México" />
          </label>
          <label className="perfil-campo"><span>Descripción</span>
            <textarea className="auth-input auth-input-static pl-4 !h-auto min-h-[110px] py-3 resize-y" maxLength={1200} value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="perfil-campo"><span>Correo de contacto</span>
              <input type="email" className="auth-input auth-input-static pl-4" maxLength={150} value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
            </label>
            <label className="perfil-campo"><span>Teléfono</span>
              <input className="auth-input auth-input-static pl-4" maxLength={60} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </label>
          </div>
          <label className="perfil-campo"><span>Página oficial (https://comecyt.edomex.gob.mx/…)</span>
            <input type="url" className="auth-input auth-input-static pl-4" maxLength={500} value={form.url_info} onChange={(e) => setForm({ ...form, url_info: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="perfil-campo"><span>Ícono</span>
              <select className="h-11 w-full" value={form.icono} onChange={(e) => setForm({ ...form, icono: e.target.value as Icono })}>
                {ICONOS.map((i) => <option key={i} value={i}>{ETIQUETA_ICONO[i]}</option>)}
              </select>
            </label>
            <label className="perfil-campo"><span>Color</span>
              <select className="h-11 w-full" value={form.tono} onChange={(e) => setForm({ ...form, tono: e.target.value as Tono })}>
                {TONOS.map((t) => <option key={t} value={t}>{ETIQUETA_TONO[t]}</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--app-ink)]">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Visible en la página pública
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={guardando}>{guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{editando ? 'Guardar cambios' : 'Agregar programa'}</Button>
            {editando && <Button type="button" variant="outline" onClick={() => { setEditando(null); setForm(FORM_VACIO); }}>Cancelar</Button>}
          </div>
        </form>

        <section className="pastel-frame" aria-busy={cargando} aria-label={`Programas de ${sistema.toUpperCase()}`}>
          <p className="mb-3 text-sm text-[var(--app-ink-2)]">{lista.length} programas · {activos} visibles. Usa las flechas para cambiar el orden en que aparecen.</p>
          {cargando ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
          ) : lista.length === 0 ? (
            <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
              <p className="font-bold text-[var(--app-ink)]">Sin programas</p>
              <p className="text-sm text-[var(--app-ink-2)]">Agrega el primero con el formulario.</p>
            </div>
          ) : (
            <ul className="data-grid grid grid-cols-1 gap-3">
              {lista.map((p, i) => (
                <li key={p.id} className="app-card data-card flex flex-wrap items-center gap-3 p-4" data-inactivo={!p.activo || undefined}>
                  <span className="tone-chip h-10 w-10" data-tone={p.tono === 'peach' ? 'amber' : p.tono === 'mint' ? 'emerald' : 'sky'}><IconoPrograma icono={p.icono} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--app-ink)]">{p.nombre} {!p.activo && <span className="pill ml-1" data-tone="neutral">oculto</span>}</p>
                    <p className="truncate text-xs text-[var(--app-ink-2)]">{p.dirigido_a || 'Sin población objetivo'}{p.correo ? ` · ${p.correo}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="icon-sm" variant="outline" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${p.nombre}`}><ArrowUp /></Button>
                    <Button size="icon-sm" variant="outline" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label={`Bajar ${p.nombre}`}><ArrowDown /></Button>
                    <Button size="icon-sm" variant="soft" onClick={() => cambiarActivo(p)} aria-label={p.activo ? `Ocultar ${p.nombre}` : `Mostrar ${p.nombre}`} title={p.activo ? 'Ocultar' : 'Mostrar'}>{p.activo ? <EyeOff /> : <Eye />}</Button>
                    <Button size="icon-sm" variant="soft" onClick={() => editar(p)} aria-label={`Editar ${p.nombre}`}><Pencil /></Button>
                    <Button size="icon-sm" variant="destructive" onClick={() => setBorrar(p)} aria-label={`Eliminar ${p.nombre}`}><Trash2 /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <ConfirmDialog open={borrar !== null} title="Eliminar programa" description={`Se eliminará «${borrar?.nombre ?? ''}» de la página pública. Si solo quieres ocultarlo, usa el ojo.`}
        confirmLabel="Eliminar" variant="destructive" onConfirm={eliminar} onCancel={() => setBorrar(null)} />
    </>
  );
}

function ListaTextos({ clave, titulo, ayuda, max, largo, avisar }: { clave: string; titulo: string; ayuda: string; max: number; largo: number; avisar: Avisar }) {
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    api.get(`/admin/contenido-sitio/${clave}`)
      .then(({ data }) => setTexto(Array.isArray(data?.valor) ? data.valor.filter((s: unknown) => typeof s === 'string').join('\n') : ''))
      .catch((e) => avisar({ tipo: 'error', texto: err(e, 'No se pudo cargar.') }))
      .finally(() => setCargando(false));
  }, [clave, avisar]);
  const lineas = texto.split('\n').map((s) => s.trim()).filter(Boolean);
  const largas = lineas.filter((s) => s.length > largo).length;
  const guardar = async () => {
    if (lineas.length > max) { avisar({ tipo: 'error', texto: `Máximo ${max} elementos.` }); return; }
    if (largas) { avisar({ tipo: 'error', texto: `Cada elemento admite hasta ${largo} caracteres.` }); return; }
    setGuardando(true);
    try { await api.put(`/admin/contenido-sitio/${clave}`, { valor: lineas }); avisar({ tipo: 'success', texto: `${titulo}: guardado.` }); }
    catch (e) { avisar({ tipo: 'error', texto: err(e, 'No se pudo guardar.') }); } finally { setGuardando(false); }
  };
  return (
    <section className="perfil-tarjeta space-y-3" aria-busy={cargando}>
      <h2 className="perfil-tarjeta-titulo">{titulo}</h2>
      <p className="text-sm text-[var(--app-ink-2)]">{ayuda}</p>
      <textarea aria-label={titulo} className="auth-input auth-input-static pl-4 !h-auto min-h-[260px] py-3 resize-y" value={texto} onChange={(e) => setTexto(e.target.value)} disabled={cargando} />
      <p className="text-xs text-[var(--app-ink-2)]">{lineas.length} / {max} elementos{largas ? ` · ${largas} demasiado largos` : ''}</p>
      <Button onClick={guardar} disabled={guardando || cargando}>{guardando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Guardar</Button>
    </section>
  );
}

function Documentos({ avisar }: { avisar: Avisar }) {
  const [docs, setDocs] = useState<{ titulo: string; detalle: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    api.get('/admin/contenido-sitio/sigae.documentos')
      .then(({ data }) => setDocs(Array.isArray(data?.valor) ? data.valor.map((d: { titulo?: unknown; detalle?: unknown }) => ({ titulo: String(d?.titulo ?? ''), detalle: String(d?.detalle ?? '') })) : []))
      .catch((e) => avisar({ tipo: 'error', texto: err(e, 'No se pudo cargar.') }))
      .finally(() => setCargando(false));
  }, [avisar]);
  const guardar = async () => {
    const limpios = docs.map((d) => ({ titulo: d.titulo.trim(), detalle: d.detalle.trim() })).filter((d) => d.titulo);
    setGuardando(true);
    try { await api.put('/admin/contenido-sitio/sigae.documentos', { valor: limpios }); setDocs(limpios); avisar({ tipo: 'success', texto: 'Documentos guardados.' }); }
    catch (e) { avisar({ tipo: 'error', texto: err(e, 'No se pudo guardar.') }); } finally { setGuardando(false); }
  };
  return (
    <section className="perfil-tarjeta space-y-3" aria-busy={cargando}>
      <h2 className="perfil-tarjeta-titulo">Documentos que se preparan (SIGAE)</h2>
      <p className="text-sm text-[var(--app-ink-2)]">Desde el 15/10/2026 ya no se muestran en la landing (se quitó el apartado «Lo que vas a preparar»); se conservan aquí por si se vuelven a publicar.</p>
      <ul className="space-y-2">
        {docs.map((d, i) => (
          <li key={i} className="grid gap-2 rounded-2xl bg-[var(--app-card-bg)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
            <input aria-label={`Documento ${i + 1}: título`} className="auth-input auth-input-static pl-3" maxLength={120} value={d.titulo} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))} placeholder="Título" />
            <input aria-label={`Documento ${i + 1}: detalle`} className="auth-input auth-input-static pl-3" maxLength={160} value={d.detalle} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, detalle: e.target.value } : x)))} placeholder="Detalle" />
            <Button size="icon-sm" variant="destructive" onClick={() => setDocs(docs.filter((_, j) => j !== i))} aria-label={`Quitar documento ${i + 1}`}><Trash2 /></Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setDocs([...docs, { titulo: '', detalle: '' }])} disabled={docs.length >= 20}><Plus className="h-4 w-4" aria-hidden="true" />Agregar documento</Button>
        <Button onClick={guardar} disabled={guardando || cargando}>{guardando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Guardar</Button>
      </div>
    </section>
  );
}
