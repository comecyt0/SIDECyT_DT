'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

interface Periodo { id: number; nombre: string; fecha_inicio: string | null; fecha_fin: string | null; activo: boolean; convocatorias_count?: number }

const VACIO = { nombre: '', fecha_inicio: '', fecha_fin: '', activo: true };

function err(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || def;
}

/**
 * E45 (punto 5) — Periodos. Cada convocatoria pertenece a un periodo (se elige en su alta) y a los usuarios con
 * alcance por periodo (admin de convocatoria, revisor, evaluador, consulta) se les asignan en Usuarios.
 */
export default function PeriodosPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [borrar, setBorrar] = useState<Periodo | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/admin/periodos');
      setPeriodos(Array.isArray(data) ? data : []);
    } catch (e) {
      setAviso({ tipo: 'error', texto: err(e, 'No se pudieron cargar los periodos.') });
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nombre.trim().length < 2) { setAviso({ tipo: 'error', texto: 'Escribe el nombre del periodo.' }); return; }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) { setAviso({ tipo: 'error', texto: 'La fecha de fin debe ser posterior al inicio.' }); return; }
    setGuardando(true);
    try {
      const cuerpo = { nombre: form.nombre.trim(), fecha_inicio: form.fecha_inicio || null, fecha_fin: form.fecha_fin || null, activo: form.activo };
      if (editando) await api.put(`/admin/periodos/${editando}`, cuerpo);
      else await api.post('/admin/periodos', cuerpo);
      setAviso({ tipo: 'success', texto: editando ? 'Periodo actualizado.' : 'Periodo creado.' });
      setForm(VACIO);
      setEditando(null);
      void cargar();
    } catch (er) {
      setAviso({ tipo: 'error', texto: err(er, 'No se pudo guardar.') });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!borrar) return;
    const p = borrar;
    setBorrar(null);
    try {
      await api.delete(`/admin/periodos/${p.id}`);
      setAviso({ tipo: 'success', texto: 'Periodo eliminado.' });
      void cargar();
    } catch (er) {
      setAviso({ tipo: 'error', texto: err(er, 'No se pudo eliminar.') });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Periodos" description="Agrupan convocatorias y definen qué puede ver cada usuario con alcance por periodo." icon={<CalendarRange className="h-5 w-5" />} />
      {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <form onSubmit={guardar} className="perfil-tarjeta space-y-4" noValidate>
          <h2 className="perfil-tarjeta-titulo">{editando ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}{editando ? 'Editar periodo' : 'Nuevo periodo'}</h2>
          <label className="perfil-campo"><span>Nombre (p. ej. 2026-1)</span>
            <input className="auth-input auth-input-static pl-4" maxLength={120} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="perfil-campo"><span>Inicio</span>
              <input type="date" className="auth-input auth-input-static pl-4" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
            </label>
            <label className="perfil-campo"><span>Fin</span>
              <input type="date" className="auth-input auth-input-static pl-4" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--app-ink)]">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo (se puede elegir al crear convocatorias)
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={guardando}>{guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{editando ? 'Guardar cambios' : 'Crear periodo'}</Button>
            {editando && <Button type="button" variant="outline" onClick={() => { setEditando(null); setForm(VACIO); }}>Cancelar</Button>}
          </div>
        </form>

        <section className="pastel-frame" aria-busy={cargando}>
          {cargando ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
          ) : periodos.length === 0 ? (
            <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
              <span className="tone-chip" data-tone="sky"><CalendarRange aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">Aún no hay periodos</p>
              <p className="text-sm text-[var(--app-ink-2)]">Crea el primero para asignarlo a convocatorias y usuarios.</p>
            </div>
          ) : (
            <ul className="data-grid grid gap-3">
              {periodos.map((p) => (
                <li key={p.id} className="app-card data-card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--app-ink)]">{p.nombre} {!p.activo && <span className="pill ml-1" data-tone="neutral">inactivo</span>}</p>
                    <p className="text-xs text-[var(--app-ink-2)]">
                      {p.fecha_inicio ? formatDate(p.fecha_inicio) : 'sin inicio'} – {p.fecha_fin ? formatDate(p.fecha_fin) : 'sin fin'} · {p.convocatorias_count ?? 0} convocatorias
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="soft" onClick={() => { setEditando(p.id); setForm({ nombre: p.nombre, fecha_inicio: p.fecha_inicio ?? '', fecha_fin: p.fecha_fin ?? '', activo: p.activo }); }} aria-label={`Editar ${p.nombre}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => setBorrar(p)} aria-label={`Eliminar ${p.nombre}`} disabled={(p.convocatorias_count ?? 0) > 0}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog open={borrar !== null} title="Eliminar periodo" description={`Se eliminará «${borrar?.nombre ?? ''}». Los usuarios con este periodo lo perderán.`}
        confirmLabel="Eliminar" variant="destructive" onConfirm={eliminar} onCancel={() => setBorrar(null)} />
    </div>
  );
}
