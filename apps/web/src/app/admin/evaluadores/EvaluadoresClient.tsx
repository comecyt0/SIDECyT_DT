'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Link2 } from 'lucide-react';
import StepFrame from '@/components/ui/step-frame';
import api from '@/lib/api';
import type { User, Solicitud } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';

export type Evaluador = Pick<User, 'id' | 'name' | 'email' | 'rol_id'>;

interface Props {
  evaluadores: Evaluador[];
  revisores: Evaluador[];
  solicitudes: Solicitud[];
}

const emptyForm = { solicitud_id: '', evaluador_id: '', fecha_limite: '' };

export default function EvaluadoresClient({ evaluadores, revisores, solicitudes }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);

  const handleAsignar = async () => {
    if (!form.solicitud_id || !form.evaluador_id || !form.fecha_limite) {
      setFeedback({ type: 'error', message: 'Faltan datos: solicitud, evaluador y fecha límite.' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/asignaciones-evaluador', {
        solicitud_id: Number(form.solicitud_id),
        evaluador_id: Number(form.evaluador_id),
        fecha_limite: form.fecha_limite,
      });
      setShowModal(false);
      setForm(emptyForm);
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al asignar evaluador';
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
          <h1 className="text-3xl font-bold text-neutral-dark">Revisores y evaluadores</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Quién revisa los documentos y quién dictamina cada proyecto.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowModal(true); }}>
          <UserPlus className="mr-2 h-4 w-4" /> Asignar evaluador
        </Button>
      </div>

      {/* Evaluadores */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <Users className="w-5 h-5" /> Evaluadores ({evaluadores.length})
          </CardTitle>
          <CardDescription>Investigadores con acceso al módulo de evaluación técnica.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
              <TableRow>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Nombre</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Email</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Rol</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluadores.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-neutral-400 dark:text-neutral-500">Sin evaluadores registrados.</TableCell></TableRow>
              ) : evaluadores.map(ev => (
                <TableRow key={ev.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <TableCell className="font-semibold text-neutral-800 dark:text-neutral-100">{ev.name}</TableCell>
                  <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">{ev.email}</TableCell>
                  <TableCell><Badge className="bg-purple-100 text-purple-800 shadow-none">Evaluador</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5"
                      onClick={() => { setForm({...emptyForm, evaluador_id: String(ev.id)}); setShowModal(true); }}>
                      <Link2 className="h-4 w-4 mr-1" /> Asignar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revisores */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-amber-700 flex items-center gap-2">
            <Users className="w-5 h-5" /> Revisores ({revisores.length})
          </CardTitle>
          <CardDescription>Personal con acceso al módulo de revisión documental.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
              <TableRow>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Nombre</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Email</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisores.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="h-20 text-center text-neutral-400 dark:text-neutral-500">Sin revisores registrados.</TableCell></TableRow>
              ) : revisores.map((rv) => (
                <TableRow key={rv.id} className="hover:bg-amber-50/30">
                  <TableCell className="font-semibold text-neutral-800 dark:text-neutral-100">{rv.name}</TableCell>
                  <TableCell className="text-neutral-500 dark:text-neutral-400 text-sm">{rv.email}</TableCell>
                  <TableCell><Badge className="bg-amber-100 text-amber-800 shadow-none">Revisor</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Asignación por pasos */}
      <StepFrame
        open={showModal}
        size="md"
        title="Asignar un evaluador"
        icon={<Link2 className="h-5 w-5" />}
        intro={<>El evaluador recibirá la solicitud en su bandeja y tendrá hasta la <strong>fecha límite</strong> para emitir su dictamen. Puedes quitar la asignación después si hace falta.</>}
        steps={[
          {
            key: 'solicitud',
            label: 'La solicitud',
            question: '¿Qué proyecto se va a evaluar?',
            validate: () => (!form.solicitud_id ? 'Elige la solicitud.' : null),
            content: (
              <div className="space-y-1.5">
                <Label htmlFor="asig-solicitud" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Solicitud *</Label>
                <select id="asig-solicitud" value={form.solicitud_id} onChange={e => setForm({ ...form, solicitud_id: e.target.value })} className="auth-input auth-input-static pl-4">
                  <option value="">Elige una solicitud…</option>
                  {solicitudes.map((s) => (
                    <option key={s.id} value={s.id}>{s.folio} — {s.titulo_proyecto?.substring(0, 60)}</option>
                  ))}
                </select>
                <p className="text-xs text-[var(--app-ink-2)]">Solo aparecen las solicitudes que ya pasaron la revisión documental.</p>
              </div>
            ),
          },
          {
            key: 'evaluador',
            label: 'Quién evalúa',
            question: '¿Quién hará el dictamen?',
            validate: () => (!form.evaluador_id ? 'Elige al evaluador.' : null),
            content: (
              <div className="space-y-1.5">
                <Label htmlFor="asig-evaluador" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Evaluador *</Label>
                <select id="asig-evaluador" value={form.evaluador_id} onChange={e => setForm({ ...form, evaluador_id: e.target.value })} className="auth-input auth-input-static pl-4">
                  <option value="">Elige un evaluador…</option>
                  {evaluadores.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
            ),
          },
          {
            key: 'fecha',
            label: 'Para cuándo',
            question: '¿Hasta qué día tiene para dictaminar?',
            validate: () => (!form.fecha_limite ? 'Indica la fecha límite.' : null),
            content: (
              <div className="space-y-1.5">
                <Label htmlFor="asig-fecha" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Fecha límite *</Label>
                <input
                  id="asig-fecha"
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  value={form.fecha_limite}
                  onChange={e => setForm({ ...form, fecha_limite: e.target.value })}
                  className="auth-input auth-input-static pl-4"
                />
                <p className="text-xs text-[var(--app-ink-2)]">A partir de mañana. El evaluador la verá como recordatorio.</p>
              </div>
            ),
          },
        ]}
        onClose={() => setShowModal(false)}
        onSubmit={handleAsignar}
        submitting={saving}
        submitLabel="Asignar"
      />
    </div>
  );
}
