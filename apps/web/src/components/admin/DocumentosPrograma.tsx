'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import SelectorFormatos, { normalizarFormatos, TIPOS_ARCHIVO } from '@/components/admin/SelectorFormatos';
import { textoLegible } from '@/lib/errores-formulario';

interface Doc {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string | null;
  obligatorio: boolean;
  activo: boolean;
  formato_permitido?: string | null;
  tamaño_maximo_mb?: number | null;
  /** E56: ya hay archivos subidos con este documento (quitarlo lo oculta en vez de borrarlo). */
  en_uso?: boolean;
}
type Editable = Doc & { lista: string[]; mb: number; cambiado?: boolean; error?: string; guardado?: boolean };

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);

/**
 * E45 (punto 6) — Documentos de un programa con sus límites: el admin decide, por documento, qué tipos de archivo
 * se aceptan (PDF, imagen, Word/Excel, ZIP) y el tamaño máximo (1–20 MB). El backend valida el contenido real.
 */
export default function DocumentosPrograma({ programaId }: { programaId: string }) {
  const [docs, setDocs] = useState<Editable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | 'nuevo' | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: '', obligatorio: true, lista: ['pdf'], mb: 5 });
  const [borrar, setBorrar] = useState<Editable | null>(null);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/programas/${programaId}/documentos`);
      const lista: Doc[] = Array.isArray(data) ? data : data?.data ?? [];
      setDocs(lista.map((d) => ({ ...d, lista: normalizarFormatos(d.formato_permitido ?? 'pdf'), mb: Number(d['tamaño_maximo_mb'] ?? 5) || 5 })));
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudieron cargar los documentos.' });
    } finally {
      setCargando(false);
    }
  }, [programaId]);
  useEffect(() => { void cargar(); }, [cargar]);

  const guardar = async (d: Editable) => {
    if (!d.nombre.trim()) { setAviso({ tipo: 'error', texto: 'El nombre del documento no puede quedar vacío.' }); return; }
    setGuardando(d.id);
    try {
      await api.put(`/admin/programas/${programaId}/documentos/${d.id}`, {
        nombre: d.nombre.trim(), obligatorio: d.obligatorio, activo: d.activo, formato_permitido: d.lista, 'tamaño_maximo_mb': d.mb,
      });
      setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, nombre: d.nombre.trim(), cambiado: false, error: undefined, guardado: true } : x)));
    } catch (er) {
      // El resultado se muestra en la misma tarjeta (el aviso general queda fuera de la vista).
      const r = (er as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const error = textoLegible((r?.errors ? Object.values(r.errors)[0]?.[0] : undefined) || r?.message || '') || 'No se pudo guardar el documento.';
      setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, error, guardado: false } : x)));
    } finally {
      setGuardando(null);
    }
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    const clave = slug(nuevo.nombre);
    if (!clave) { setErrorNuevo('Escribe el nombre del documento.'); return; }
    setErrorNuevo(null);
    setGuardando('nuevo');
    try {
      await api.post(`/admin/programas/${programaId}/documentos`, {
        nombre: nuevo.nombre.trim(), clave, obligatorio: nuevo.obligatorio, activo: true, orden: docs.length + 1,
        formato_permitido: nuevo.lista, 'tamaño_maximo_mb': nuevo.mb,
      });
      setNuevo({ nombre: '', obligatorio: true, lista: ['pdf'], mb: 5 });
      setAviso({ tipo: 'success', texto: 'Documento agregado.' });
      void cargar();
    } catch (er) {
      // 20/10/2026: el error va junto al formulario (el aviso de arriba quedaba fuera de la vista) y sin texto técnico.
      const d = (er as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const primero = d?.errors ? Object.values(d.errors)[0]?.[0] : undefined;
      setErrorNuevo(textoLegible(primero || d?.message || '') || 'No se pudo agregar el documento. Inténtalo de nuevo.');
    } finally {
      setGuardando(null);
    }
  };

  const eliminar = async () => {
    if (!borrar) return;
    const d = borrar;
    setBorrar(null);
    try {
      const { data } = await api.delete(`/admin/programas/${programaId}/documentos/${d.id}`);
      setAviso({ tipo: 'success', texto: typeof data?.message === 'string' ? data.message : 'Documento eliminado.' });
      void cargar();
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo quitar el documento.' });
    }
  };

  const etiquetas = (lista: string[]) => lista.map((k) => TIPOS_ARCHIVO.find((t) => t.key === k)?.label ?? k).join(', ');

  return (
    <div className="space-y-5">
      {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}
      {cargando ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((d) => (
            <section key={d.id} className="perfil-tarjeta space-y-4" aria-label={d.nombre}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* 20/10/2026 (reporte del usuario: texto desfasado): el ícono no se encoge con títulos largos y queda
                      alineado a la primera línea; la clave técnica se parte para no salirse de la tarjeta. */}
                  {/* 20/10/2026 (pedido del usuario): el nombre que se pide también se edita aquí. La clave interna no
                      cambia: los archivos ya subidos están ligados a ella. */}
                  <label className="flex items-start gap-2">
                    <FileText className="mt-3 h-4 w-4 shrink-0 text-[var(--sg-vino)]" aria-hidden="true" />
                    <span className="sr-only">Nombre del documento</span>
                    <textarea rows={2} maxLength={255} value={d.nombre}
                      className="auth-input auth-input-static !h-auto min-h-[52px] w-full resize-y py-2.5 pl-3 text-sm font-semibold leading-snug"
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      onChange={(e) => { const nombre = e.target.value.replace(/[\r\n\t]+/g, ' '); setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, nombre, cambiado: true } : x))); }} />
                  </label>
                  <p className="mt-1 text-xs text-[var(--app-ink-2)] [overflow-wrap:anywhere]">{etiquetas(d.lista)} · hasta {d.mb} MB · <code className="break-all font-mono">{d.clave}</code></p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {!d.activo && <span className="pill" data-tone="neutral">Oculto</span>}
                    {d.en_uso && <span className="pill" data-tone="sky" title="Ya hay archivos subidos con este documento">Tiene archivos</span>}
                  </p>
                </div>
                {!(d.en_uso && !d.activo) && <Button size="sm" variant="destructive" onClick={() => setBorrar(d)} aria-label={`Quitar ${d.nombre}`}><Trash2 className="h-4 w-4" /></Button>}
              </div>
              <SelectorFormatos idBase={`doc-${d.id}`} formatos={d.lista} tamano={d.mb}
                onChange={(lista, mb) => setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, lista, mb, cambiado: true } : x)))} />
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--app-ink)]">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={d.obligatorio} onChange={(e) => setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, obligatorio: e.target.checked, cambiado: true } : x)))} />Obligatorio</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={d.activo} onChange={(e) => setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, activo: e.target.checked, cambiado: true } : x)))} />Activo</label>
              </div>
              <Button size="sm" onClick={() => guardar(d)} disabled={guardando === d.id || !d.cambiado}>
                {guardando === d.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Guardar
              </Button>
              {d.error && <p role="alert" className="text-sm font-medium" style={{ color: 'var(--auth-danger)' }}>{d.error}</p>}
              {d.guardado && !d.cambiado && !d.error && <p role="status" className="text-sm font-medium" style={{ color: 'var(--tile-emerald-fg)' }}>Cambios guardados.</p>}
            </section>
          ))}

          <form onSubmit={crear} className="perfil-tarjeta space-y-4" aria-label="Agregar documento">
            <h3 className="perfil-tarjeta-titulo"><Plus aria-hidden="true" />Agregar documento</h3>
            {/* 20/10/2026: los nombres largos (pegados de la convocatoria) se ven completos; los saltos de línea se quitan. */}
            <label className="perfil-campo"><span>Nombre</span>
              <textarea className="auth-input auth-input-static !h-auto min-h-[52px] resize-y py-3 pl-4 leading-snug" rows={2} maxLength={255} value={nuevo.nombre}
                onChange={(e) => { setErrorNuevo(null); setNuevo({ ...nuevo, nombre: e.target.value.replace(/[\r\n\t]+/g, ' ') }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} placeholder="Ej. Cotización del equipo" />
              <span className="text-xs font-normal text-[var(--app-ink-2)]">{nuevo.nombre.length}/255</span>
            </label>
            <SelectorFormatos idBase="doc-nuevo" formatos={nuevo.lista} tamano={nuevo.mb} onChange={(lista, mb) => setNuevo({ ...nuevo, lista, mb })} />
            <label className="inline-flex items-center gap-2 text-sm text-[var(--app-ink)]"><input type="checkbox" checked={nuevo.obligatorio} onChange={(e) => setNuevo({ ...nuevo, obligatorio: e.target.checked })} />Obligatorio</label>
            {errorNuevo && <p role="alert" className="text-sm font-medium" style={{ color: 'var(--auth-danger)' }}>{errorNuevo}</p>}
            <Button type="submit" disabled={guardando === 'nuevo'}>{guardando === 'nuevo' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Agregar</Button>
          </form>
        </div>
      )}
      <ConfirmDialog open={borrar !== null} title="¿Quitar el documento?"
        description={borrar?.en_uso
          ? `«${borrar?.nombre ?? ''}» ya tiene archivos subidos: se ocultará para las solicitudes nuevas y se conservarán los archivos. Puedes volver a mostrarlo marcando «Activo».`
          : `«${borrar?.nombre ?? ''}» todavía no tiene archivos: se eliminará.`}
        confirmLabel={borrar?.en_uso ? 'Ocultar' : 'Eliminar'} variant="destructive" onConfirm={eliminar} onCancel={() => setBorrar(null)} />
    </div>
  );
}
