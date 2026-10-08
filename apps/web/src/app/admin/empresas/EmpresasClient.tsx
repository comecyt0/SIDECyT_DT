'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Building, Plus, Edit, Eye, X, MapPin } from 'lucide-react';
import StepFrame from '@/components/ui/step-frame';
import PageHeader from '@/components/ui/page-header';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { AlertBox } from '@/components/ui/alert-box';
import { DataCardGrid } from '@/components/ui/DataCardGrid';
import AvisoErrores from '@/components/ui/aviso-errores';
import { erroresFormulario, type ErroresFormulario } from '@/lib/errores-formulario';

export interface EmpresaRow {
  id: number;
  nombre: string;
  acronimo?: string;
  activa?: boolean;
  municipio?: { nombre: string } | null;
}

interface Props {
  empresas: EmpresaRow[];
}

const emptyForm = { nombre: '', acronimo: '', activa: true };

export default function EmpresasClient({ empresas }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewInst, setPreviewInst] = useState<EmpresaRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'info' | 'warning'; message: string } | null>(null);
  // Error al guardar: dentro de la ventana y en el paso del campo (antes quedaba detrás del modal, sin verse).
  const [errorGuardar, setErrorGuardar] = useState<ErroresFormulario | null>(null);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setErrorGuardar(null);
    setShowModal(true);
  };
  const openEdit = (inst: EmpresaRow) => {
    setEditId(inst.id);
    setForm({ nombre: inst.nombre, acronimo: inst.acronimo || '', activa: inst.activa ?? true });
    setShowPreview(false);
    setErrorGuardar(null);
    setShowModal(true);
  };
  const openPreview = (inst: EmpresaRow) => {
    setPreviewInst(inst);
    setShowPreview(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setErrorGuardar({ titulo: 'Escribe el nombre de la empresa.', lineas: [], campos: {}, paso: 'nombre' });
      return;
    }
    setSaving(true);
    setErrorGuardar(null);
    try {
      if (editId) {
        await api.put(`/admin/empresas/${editId}`, form);
      } else {
        await api.post('/admin/empresas', form);
      }
      setShowModal(false);
      setFeedback({ type: 'success', message: editId ? 'Empresa actualizada.' : `Empresa «${form.nombre.trim()}» creada.` });
      // Invalida el cache del Server Component padre y vuelve a renderizar
      router.refresh();
    } catch (err: unknown) {
      setErrorGuardar(erroresFormulario(err,
        { nombre: 'Nombre oficial', acronimo: 'Siglas', activa: 'Empresa activa', activo: 'Empresa activa' },
        { nombre: 'nombre', acronimo: 'nombre', activa: 'estado', activo: 'estado' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <PageHeader
        title="Empresas"
        description="Las empresas son las organizaciones que presentan proyectos. Da de alta una nueva o corrige los datos de las que ya existen."
        icon={<Building className="h-5 w-5" />}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva empresa
          </Button>
        }
      />

      <DataCardGrid
        items={empresas}
        getKey={(e) => e.id}
        columns={3}
        accentColor={(e) => (e.activa !== false ? 'emerald' : 'red')}
        emptyState={
          <div className="empty-state">
            <span className="tone-chip" data-tone="violet"><Building aria-hidden="true" /></span>
            <p className="font-bold text-[var(--app-ink)]">Sin empresas todavía</p>
            <p className="text-sm text-[var(--app-ink-2)]">Crea la primera con el botón «Nueva empresa».</p>
          </div>
        }
        renderCard={(inst) => (
          <div className="pl-3">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--auth-vino)' }}>
                  <Building className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{inst.acronimo || `Empresa nº ${inst.id}`}</span>
                </div>
                <h3 className="text-sm font-bold text-[var(--app-ink)] leading-tight line-clamp-2">{inst.nombre}</h3>
              </div>
              <Badge variant={inst.activa !== false ? 'default' : 'destructive'} className="shrink-0">
                {inst.activa !== false ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
            {inst.municipio?.nombre && (
              <p className="text-xs text-[var(--app-ink-2)] flex items-center gap-1 mb-3">
                <MapPin className="h-3 w-3" />
                {inst.municipio.nombre}
              </p>
            )}
            <div className="flex items-center justify-end gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--app-rule)' }}>
              <Button variant="soft" size="icon-sm" onClick={() => openPreview(inst)} aria-label="Ver detalle" title="Ver">
                <Eye />
              </Button>
              <Button variant="soft" size="icon-sm" onClick={() => openEdit(inst)} aria-label="Editar" title="Editar">
                <Edit />
              </Button>
            </div>
          </div>
        )}
      />

      {showPreview && previewInst && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Detalle de la empresa">
          <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>
                <Building className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Detalle de la empresa
              </CardTitle>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowPreview(false)} aria-label="Cerrar" title="Cerrar">
                <X />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-wider">Número</p>
                  <p className="text-sm font-semibold text-[var(--app-ink)] mt-1">{previewInst.id}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-wider">Siglas</p>
                  <p className="text-sm font-semibold text-[var(--app-ink)] mt-1">{previewInst.acronimo || '—'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-wider">Nombre oficial</p>
                  <p className="text-sm font-semibold text-[var(--app-ink)] mt-1">{previewInst.nombre}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-wider">Municipio</p>
                  <p className="text-sm text-[var(--app-ink)] mt-1">{previewInst.municipio?.nombre || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-wider">Estado</p>
                  <Badge variant={previewInst.activa !== false ? 'default' : 'destructive'} className="mt-1">
                    {previewInst.activa !== false ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Button className="flex-1" onClick={() => openEdit(previewInst)}>
                  <Edit className="h-4 w-4" /> Editar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowPreview(false)}>Cerrar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alta / edición por pasos */}
      <StepFrame
        open={showModal}
        size="md"
        title={editId ? 'Editar empresa' : 'Nueva empresa'}
        icon={<Building className="h-5 w-5" />}
        intro={<>Una empresa es <strong>la organización que presenta proyectos</strong>. Sus usuarios se vinculan a ella y aparece en convenios y reportes.</>}
        steps={[
          {
            key: 'nombre',
            label: 'Quién es',
            question: '¿Cómo se llama la empresa?',
            validate: () => (!form.nombre.trim() ? 'Escribe el nombre oficial de la empresa.' : null),
            content: (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="inst-nombre" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Nombre oficial <Asterisco /></Label>
                  <input id="inst-nombre" maxLength={255} placeholder="Ej. Universidad Autónoma del Estado de México" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="auth-input auth-input-static pl-4" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inst-acronimo" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Siglas (opcional)</Label>
                  <input id="inst-acronimo" maxLength={20} placeholder="Ej. UAEM" value={form.acronimo} onChange={(e) => setForm({ ...form, acronimo: e.target.value })} className="auth-input auth-input-static pl-4" />
                  <p className="text-xs text-[var(--app-ink-2)]">Se muestran en listas y tarjetas para reconocerla rápido.</p>
                </div>
              </>
            ),
          },
          {
            key: 'estado',
            label: 'Disponibilidad',
            question: '¿Puede presentar proyectos ahora?',
            content: (
              <label className="flex items-center justify-between gap-4 rounded-[var(--auth-radius-field)] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', backgroundColor: form.activa ? 'var(--tile-emerald-bg)' : 'var(--app-hover-bg)' }}>
                <span>
                  <span className="block text-sm font-semibold text-[var(--app-ink)]">Empresa activa</span>
                  <span className="block text-xs text-[var(--app-ink-2)]">Si la apagas, sigue en el catálogo pero no podrá registrar nuevas solicitudes.</span>
                </span>
                <input type="checkbox" id="inst-activa" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} className="h-5 w-5 rounded accent-[var(--auth-vino)]" />
              </label>
            ),
          },
        ]}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        error={errorGuardar ? <AvisoErrores errores={errorGuardar} /> : null}
        errorStep={errorGuardar?.paso ?? null}
        submitting={saving}
        submitLabel={editId ? 'Guardar cambios' : 'Crear empresa'}
      />
    </div>
  );
}
