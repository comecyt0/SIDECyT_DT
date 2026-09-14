'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, Ban, Unlock, Loader2, AlertTriangle, X, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { colorMap } from '@/lib/color-mapper';
import type { ListaNegra, Empresa } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { INSTITUTION } from '@/lib/institution';
import { DataCardGrid } from '@/components/ui/DataCardGrid';
import { Building } from 'lucide-react';

const emptyForm = {
  empresa_id: '',
  motivo: '',
  fecha_inicio_sancion: new Date().toISOString().split('T')[0],
  fecha_fin_sancion: '',
  activa: true,
};

interface Props {
  sanciones: ListaNegra[];
  empresas: Empresa[];
}

export default function ListaNegraClient({ sanciones, empresas }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; description: string; onConfirm: () => void}>({
    open: false, title: '', description: '', onConfirm: () => {}
  });

  const handleRemoveVeto = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Remover Veto',
      description: '¿Confirmar la eliminación del veto a esta institución?',
      onConfirm: async () => {
        setRemovingId(id);
        try {
          await api.put(`/admin/lista-negra/${id}`, { activa: false, fecha_fin_sancion: new Date().toISOString().split('T')[0] });
          router.refresh();
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al actualizar sanción';
          setFeedback({ type: 'error', message: msg });
        } finally {
          setRemovingId(null);
        }
      },
    });
  };

  const handleSave = async () => {
    if (!form.empresa_id || !form.motivo || !form.fecha_inicio_sancion) {
      setFeedback({ type: 'error', message: 'Por favor completa todos los campos requeridos.' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/lista-negra', { ...form, activa: true });
      setShowModal(false);
      setForm(emptyForm);
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al registrar sanción';
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
          <h1 className="text-3xl font-bold text-neutral-dark">Lista Negra de Empresas</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{`Control de entidades bloqueadas por incumplimiento de normativas ${INSTITUTION.name}.`}</p>
        </div>
        <Button variant="destructive" className="shadow-md" onClick={() => setShowModal(true)}>
          <Ban className="mr-2 h-4 w-4" /> Registrar Sanción
        </Button>
      </div>

      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm relative overflow-hidden ring-1 ring-black/5">
        <div className="bg-gradient-to-r from-red-600/40 via-red-800/40 to-transparent h-1 w-full absolute top-0" />
        <CardHeader className="bg-red-50/50 border-b border-red-100">
          <CardTitle className="text-lg text-red-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-700" /> Registro de Sanciones {INSTITUTION.name}
          </CardTitle>
          <CardDescription>Las empresas vetadas no podrán ingresar nuevas solicitudes al sistema.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataCardGrid
            items={sanciones}
            getKey={(s) => s.id}
            columns={2}
            accentColor={(s) => (s.activa ? 'red' : 'emerald')}
            emptyState={
              <div className="text-center py-16">
                <AlertTriangle className="mx-auto h-10 w-10 text-neutral-300 mb-3" />
                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Sin sanciones activas</p>
                <p className="text-xs text-neutral-400 mt-1">No hay empresas vetadas actualmente.</p>
              </div>
            }
            renderCard={(s) => (
              <div className="pl-3">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building className="h-4 w-4 text-red-600 shrink-0" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate">
                      {s.empresa?.nombre || `Empresa #${s.empresa_id}`}
                    </h3>
                  </div>
                  {s.activa
                    ? <Badge variant="destructive" className="shrink-0 text-[10px]">BLOQUEADO</Badge>
                    : <Badge variant="default" className="shrink-0 text-[10px]">LIBERADO</Badge>
                  }
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-3 line-clamp-2" title={s.motivo}>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-400 dark:text-neutral-500 block mb-0.5">Motivo</span>
                  {s.motivo}
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">Inicio</span>
                    <span className="font-mono text-neutral-600 dark:text-neutral-300">{s.fecha_inicio_sancion}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">Fin</span>
                    <span className="font-mono text-neutral-600 dark:text-neutral-300">{s.fecha_fin_sancion || 'Indefinido'}</span>
                  </div>
                </div>
                {s.activa && (
                  <div className="pt-2 border-t border-neutral-50 dark:border-neutral-800 flex justify-end">
                    <Button variant="outline" size="sm" disabled={removingId === s.id} onClick={() => handleRemoveVeto(s.id)}
                      className={`${colorMap.states.success.text} text-xs`}>
                      {removingId === s.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Unlock className="w-3 h-3 mr-1" />}
                      Remover Veto
                    </Button>
                  </div>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="destructive"
      />

      {/* Modal Nueva Sanción */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-700">
              <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                <Ban className="h-5 w-5" /> Nueva Sanción
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Empresa a Sancionar <span className="text-red-500">*</span></Label>
                <Select value={form.empresa_id} onValueChange={v => setForm({...form, empresa_id: v ?? ''})}>
                  <SelectTrigger><SelectValue placeholder="Selecciona empresa..." /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo del Bloqueo <span className="text-red-500">*</span></Label>
                <Textarea placeholder="Especifica el incumplimiento o causa de la sanción..." value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} className="min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Inicio <span className="text-red-500">*</span></Label>
                  <Input type="date" value={form.fecha_inicio_sancion} onChange={e => setForm({...form, fecha_inicio_sancion: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Fin (opcional)</Label>
                  <Input type="date" value={form.fecha_fin_sancion} onChange={e => setForm({...form, fecha_fin_sancion: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button className="flex-1" disabled={saving} onClick={handleSave}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Registrar Sanción
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
