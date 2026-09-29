'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, Ban, Unlock, Loader2, Building } from 'lucide-react';
import StepFrame from '@/components/ui/step-frame';
import PageHeader from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { ListaNegra, Empresa } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataCardGrid } from '@/components/ui/DataCardGrid';
import { parseDate } from '@/lib/format';
import AvisoErrores from '@/components/ui/aviso-errores';
import { erroresFormulario, type ErroresFormulario } from '@/lib/errores-formulario';

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
      title: 'Levantar sanción',
      description: 'La empresa podrá volver a presentar solicitudes a partir de hoy. ¿Quieres continuar?',
      onConfirm: async () => {
        setRemovingId(id);
        try {
          await api.put(`/admin/lista-negra/${id}`, { activa: false, fecha_fin_sancion: new Date().toISOString().split('T')[0] });
          router.refresh();
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo levantar la sanción. Inténtalo de nuevo.';
          setFeedback({ type: 'error', message: msg });
        } finally {
          setRemovingId(null);
        }
      },
    });
  };

  // Error al guardar: dentro de la ventana y en el paso del campo (antes quedaba detrás del modal, sin verse).
  const [errorGuardar, setErrorGuardar] = useState<ErroresFormulario | null>(null);

  const handleSave = async () => {
    if (!form.empresa_id || !form.motivo || !form.fecha_inicio_sancion) {
      setErrorGuardar({ titulo: 'Elige la empresa, escribe el motivo e indica desde qué día aplica.', lineas: [], campos: {}, paso: !form.empresa_id || !form.motivo ? 'quien' : 'cuando' });
      return;
    }
    setSaving(true);
    setErrorGuardar(null);
    try {
      await api.post('/admin/lista-negra', { ...form, activa: true });
      setShowModal(false);
      setForm(emptyForm);
      setFeedback({ type: 'success', message: 'Sanción registrada. La empresa ya no puede presentar solicitudes.' });
      router.refresh();
    } catch (err: unknown) {
      setErrorGuardar(erroresFormulario(err,
        { empresa_id: 'Empresa', motivo: 'Motivo', fecha_inicio_sancion: 'Desde', fecha_fin_sancion: 'Hasta', solicitud_id: 'Solicitud' },
        { empresa_id: 'quien', motivo: 'quien', solicitud_id: 'quien', fecha_inicio_sancion: 'cuando', fecha_fin_sancion: 'cuando' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <PageHeader
        title="Lista negra"
        description="Empresas que no pueden presentar solicitudes por un incumplimiento. Registra una sanción o levántala cuando corresponda."
        icon={<ShieldAlert className="h-5 w-5" />}
        actions={
          <Button variant="destructive" onClick={() => { setErrorGuardar(null); setShowModal(true); }}>
            <Ban className="h-4 w-4" /> Registrar sanción
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <ShieldAlert className="h-4 w-4" style={{ color: 'var(--auth-danger)' }} /> Sanciones registradas
          </CardTitle>
          <CardDescription>Mientras una sanción esté activa, la empresa no podrá enviar nuevas solicitudes.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataCardGrid
            items={sanciones}
            getKey={(s) => s.id}
            columns={2}
            accentColor={(s) => (s.activa ? 'red' : 'emerald')}
            emptyState={
              <div className="empty-state">
                <span className="tone-chip" data-tone="emerald"><ShieldAlert aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">Sin sanciones todavía</p>
                <p className="text-sm text-[var(--app-ink-2)]">Ninguna empresa está bloqueada. Usa «Registrar sanción» si hace falta.</p>
              </div>
            }
            renderCard={(s) => (
              <div className="pl-3">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building className="h-4 w-4 shrink-0" style={{ color: s.activa ? 'var(--auth-danger)' : 'var(--tile-emerald-fg)' }} />
                    <h3 className="text-sm font-bold text-[var(--app-ink)] truncate">
                      {s.empresa?.nombre || `Empresa nº ${s.empresa_id}`}
                    </h3>
                  </div>
                  {s.activa
                    ? <Badge variant="destructive" className="shrink-0">Bloqueada</Badge>
                    : <Badge variant="default" className="shrink-0">Liberada</Badge>
                  }
                </div>
                <p className="text-xs text-[var(--app-ink)] mb-3 line-clamp-2" title={s.motivo}>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-[var(--app-ink-2)] block mb-0.5">Motivo</span>
                  {s.motivo}
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--app-ink-2)] block">Desde</span>
                    <span className="text-[var(--app-ink)]">{s.fecha_inicio_sancion ? parseDate(s.fecha_inicio_sancion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--app-ink-2)] block">Hasta</span>
                    <span className="text-[var(--app-ink)]">{s.fecha_fin_sancion ? parseDate(s.fecha_fin_sancion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha final'}</span>
                  </div>
                </div>
                {s.activa && (
                  <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--app-rule)' }}>
                    <Button variant="soft" size="sm" disabled={removingId === s.id} onClick={() => handleRemoveVeto(s.id)}>
                      {removingId === s.id ? <Loader2 className="animate-spin" /> : <Unlock />}
                      Levantar sanción
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

      {/* Nueva sanción, por pasos */}
      <StepFrame
        open={showModal}
        size="md"
        title="Nueva sanción"
        icon={<Ban className="h-5 w-5" />}
        intro={<>Una sanción <strong>impide que la empresa presente nuevas solicitudes</strong> durante el periodo que indiques. Puedes levantarla en cualquier momento desde esta lista.</>}
        steps={[
          {
            key: 'quien',
            label: 'A quién',
            question: '¿Qué empresa y por qué?',
            validate: () => {
              if (!form.empresa_id) return 'Elige la empresa.';
              if (!form.motivo.trim()) return 'Explica el motivo: quedará registrado.';
              return null;
            },
            content: (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Empresa *</Label>
                  <Select value={form.empresa_id} onValueChange={v => setForm({...form, empresa_id: v ?? ''})}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Elige la empresa…" /></SelectTrigger>
                    <SelectContent>
                      {empresas.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Motivo *</Label>
                  <Textarea placeholder="Describe el incumplimiento con tus palabras; la empresa podrá leerlo." value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} className="min-h-[100px] rounded-[var(--auth-radius-field)]" style={{ background: 'var(--auth-field)' }} />
                </div>
              </>
            ),
          },
          {
            key: 'cuando',
            label: 'Desde cuándo',
            question: '¿Cuánto tiempo aplica?',
            validate: () => (!form.fecha_inicio_sancion ? 'Indica desde qué día aplica.' : null),
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ln-inicio" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Desde *</Label>
                  <input id="ln-inicio" type="date" value={form.fecha_inicio_sancion} onChange={e => setForm({...form, fecha_inicio_sancion: e.target.value})} className="auth-input auth-input-static pl-4" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ln-fin" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Hasta (opcional)</Label>
                  <input id="ln-fin" type="date" value={form.fecha_fin_sancion} onChange={e => setForm({...form, fecha_fin_sancion: e.target.value})} className="auth-input auth-input-static pl-4" />
                  <p className="text-xs text-[var(--app-ink-2)]">Sin fecha final, la sanción sigue hasta que la levantes.</p>
                </div>
              </div>
            ),
          },
        ]}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        error={errorGuardar ? <AvisoErrores errores={errorGuardar} /> : null}
        errorStep={errorGuardar?.paso ?? null}
        submitting={saving}
        submitLabel="Registrar sanción"
      />
    </div>
  );
}
