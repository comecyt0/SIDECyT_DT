'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Plus, Edit, Eye, Loader2, X, Save, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { AlertBox } from '@/components/ui/alert-box';
import { INSTITUTION } from '@/lib/institution';
import { DataCardGrid } from '@/components/ui/DataCardGrid';

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

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };
  const openEdit = (inst: EmpresaRow) => {
    setEditId(inst.id);
    setForm({ nombre: inst.nombre, acronimo: inst.acronimo || '', activa: inst.activa ?? true });
    setShowPreview(false);
    setShowModal(true);
  };
  const openPreview = (inst: EmpresaRow) => {
    setPreviewInst(inst);
    setShowPreview(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setFeedback({ type: 'error', message: 'El nombre es requerido' });
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/admin/empresas/${editId}`, form);
      } else {
        await api.post('/admin/empresas', form);
      }
      setShowModal(false);
      // Invalida el cache del Server Component padre y vuelve a renderizar
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Catálogo de Empresas</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{`Administra las empresas permitidas en el sistema ${INSTITUTION.name}.`}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Empresa
        </Button>
      </div>

      <DataCardGrid
        items={empresas}
        getKey={(e) => e.id}
        columns={3}
        accentColor={(e) => (e.activa !== false ? 'emerald' : 'red')}
        emptyState={
          <div className="text-center py-16 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/40">
            <Building className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Sin empresas registradas</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Haz clic en &quot;Nueva Empresa&quot; para comenzar.</p>
          </div>
        }
        renderCard={(inst) => (
          <div className="pl-3">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{inst.acronimo || `Empresa #${inst.id}`}</span>
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-tight line-clamp-2">{inst.nombre}</h3>
              </div>
              <Badge variant={inst.activa !== false ? 'default' : 'destructive'} className="shrink-0 text-[10px]">
                {inst.activa !== false ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
            {inst.municipio?.nombre && (
              <p className="text-xs text-neutral-500 dark:text-neutral-300 flex items-center gap-1 mb-3">
                <MapPin className="h-3 w-3" />
                {inst.municipio.nombre}
              </p>
            )}
            <div className="flex items-center justify-end gap-1 pt-2 border-t border-neutral-50 dark:border-neutral-800">
              <Button variant="ghost" size="icon" onClick={() => openPreview(inst)} aria-label="Ver detalle">
                <Eye className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(inst)} aria-label="Editar">
                <Edit className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              </Button>
            </div>
          </div>
        )}
      />

      {/* Preview Modal */}
      {showPreview && previewInst && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <CardTitle className="text-lg text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" /> Detalle de Empresa
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">ID</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mt-1">{previewInst.id}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Acrónimo</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mt-1">{previewInst.acronimo || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Nombre Oficial</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mt-1">{previewInst.nombre}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Municipio</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{previewInst.municipio?.nombre || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Estado</p>
                  <Badge variant={previewInst.activa !== false ? 'default' : 'destructive'} className="mt-1">
                    {previewInst.activa !== false ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button className="flex-1" onClick={() => openEdit(previewInst)}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowPreview(false)}>Cerrar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <CardTitle className="text-lg text-neutral-800 dark:text-neutral-100">{editId ? 'Editar Empresa' : 'Nueva Empresa'}</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inst-nombre">
                  Nombre Oficial <span className="text-red-500">*</span>
                </Label>
                <Input id="inst-nombre" placeholder="Ej. Universidad Autónoma del Estado de México" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-acronimo">Acrónimo / Siglas</Label>
                <Input id="inst-acronimo" placeholder="Ej. UAEM" value={form.acronimo} onChange={(e) => setForm({ ...form, acronimo: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="inst-activa" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} className="h-4 w-4 accent-primary" />
                <Label htmlFor="inst-activa" className="cursor-pointer">Empresa Activa</Label>
              </div>
              <div className="pt-4 flex gap-3">
                <Button className="flex-1 bg-primary hover:bg-primary-light text-white" disabled={saving} onClick={handleSave}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
