'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import SelectorFormatos, { normalizarFormatos, TIPOS_ARCHIVO } from '@/components/admin/SelectorFormatos';

interface Doc {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string | null;
  obligatorio: boolean;
  activo: boolean;
  formato_permitido?: string | null;
  tamaño_maximo_mb?: number | null;
}
type Editable = Doc & { lista: string[]; mb: number; cambiado?: boolean };

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
    setGuardando(d.id);
    try {
      await api.put(`/admin/programas/${programaId}/documentos/${d.id}`, {
        nombre: d.nombre, obligatorio: d.obligatorio, activo: d.activo, formato_permitido: d.lista, 'tamaño_maximo_mb': d.mb,
      });
      setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, cambiado: false } : x)));
      setAviso({ tipo: 'success', texto: `«${d.nombre}» guardado.` });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar el documento.' });
    } finally {
      setGuardando(null);
    }
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    const clave = slug(nuevo.nombre);
    if (!clave) { setAviso({ tipo: 'error', texto: 'Escribe el nombre del documento.' }); return; }
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
      const m = (er as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAviso({ tipo: 'error', texto: m || 'No se pudo agregar (¿ya existe uno con ese nombre?).' });
    } finally {
      setGuardando(null);
    }
  };

  const eliminar = async () => {
    if (!borrar) return;
    const d = borrar;
    setBorrar(null);
    try {
      await api.delete(`/admin/programas/${programaId}/documentos/${d.id}`);
      void cargar();
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo eliminar el documento.' });
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
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--app-ink)]"><FileText className="h-4 w-4 text-[var(--sg-vino)]" aria-hidden="true" />{d.nombre}</h3>
                  <p className="mt-0.5 text-xs text-[var(--app-ink-2)]">{etiquetas(d.lista)} · hasta {d.mb} MB · <code className="font-mono">{d.clave}</code></p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => setBorrar(d)} aria-label={`Eliminar ${d.nombre}`}><Trash2 className="h-4 w-4" /></Button>
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
            </section>
          ))}

          <form onSubmit={crear} className="perfil-tarjeta space-y-4" aria-label="Agregar documento">
            <h3 className="perfil-tarjeta-titulo"><Plus aria-hidden="true" />Agregar documento</h3>
            <label className="perfil-campo"><span>Nombre</span>
              <input className="auth-input auth-input-static pl-4" maxLength={255} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Ej. Cotización del equipo" />
            </label>
            <SelectorFormatos idBase="doc-nuevo" formatos={nuevo.lista} tamano={nuevo.mb} onChange={(lista, mb) => setNuevo({ ...nuevo, lista, mb })} />
            <label className="inline-flex items-center gap-2 text-sm text-[var(--app-ink)]"><input type="checkbox" checked={nuevo.obligatorio} onChange={(e) => setNuevo({ ...nuevo, obligatorio: e.target.checked })} />Obligatorio</label>
            <Button type="submit" disabled={guardando === 'nuevo'}>{guardando === 'nuevo' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Agregar</Button>
          </form>
        </div>
      )}
      <ConfirmDialog open={borrar !== null} title="Eliminar documento" description={`Se quitará «${borrar?.nombre ?? ''}» de este programa. Las solicitudes que ya lo subieron conservan su archivo.`}
        confirmLabel="Eliminar" variant="destructive" onConfirm={eliminar} onCancel={() => setBorrar(null)} />
    </div>
  );
}
