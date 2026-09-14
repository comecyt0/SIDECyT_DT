'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Loader2, X, Save, Link2 } from 'lucide-react';
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
      setFeedback({ type: 'error', message: 'Todos los campos son requeridos' });
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
          <h1 className="text-3xl font-bold text-neutral-dark">Revisores y Evaluadores</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Gestión del comité técnico y asignación de dictámenes.</p>
        </div>
        <Button className="bg-primary hover:bg-primary-light text-white shadow-md" onClick={() => setShowModal(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Asignar Evaluador
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

      {/* Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <CardTitle className="text-lg text-neutral-800 dark:text-neutral-100">Asignar Evaluador a Solicitud</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Solicitud a Evaluar <span className="text-red-500">*</span></Label>
                <select
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.solicitud_id}
                  onChange={e => setForm({...form, solicitud_id: e.target.value})}
                >
                  <option value="">Selecciona solicitud...</option>
                  {solicitudes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.folio} — {s.titulo_proyecto?.substring(0, 50)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Evaluador <span className="text-red-500">*</span></Label>
                <select
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.evaluador_id}
                  onChange={e => setForm({...form, evaluador_id: e.target.value})}
                >
                  <option value="">Selecciona evaluador...</option>
                  {evaluadores.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Fecha Límite de Evaluación <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  value={form.fecha_limite}
                  onChange={e => setForm({...form, fecha_limite: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <Button className="flex-1 bg-primary hover:bg-primary-light text-white" disabled={saving} onClick={handleAsignar}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Confirmar Asignación
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
