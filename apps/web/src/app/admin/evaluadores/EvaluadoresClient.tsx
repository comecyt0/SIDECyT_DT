'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/ui/page-header';
import { Users, UserPlus, Link2, ClipboardCheck } from 'lucide-react';
import StepFrame from '@/components/ui/step-frame';
import api from '@/lib/api';
import type { User, Solicitud } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import AvisoErrores from '@/components/ui/aviso-errores';
import { erroresFormulario, type ErroresFormulario } from '@/lib/errores-formulario';

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
  // Error al guardar: dentro de la ventana y en el paso del campo (antes quedaba detrás del modal, sin verse).
  const [errorGuardar, setErrorGuardar] = useState<ErroresFormulario | null>(null);
  const abrir = (f: typeof emptyForm) => { setForm(f); setErrorGuardar(null); setShowModal(true); };

  const handleAsignar = async () => {
    if (!form.solicitud_id || !form.evaluador_id || !form.fecha_limite) {
      setErrorGuardar({ titulo: 'Elige la solicitud, el evaluador y la fecha límite.', lineas: [], campos: {}, paso: !form.solicitud_id ? 'solicitud' : !form.evaluador_id ? 'evaluador' : 'fecha' });
      return;
    }
    setSaving(true);
    setErrorGuardar(null);
    try {
      await api.post('/admin/asignaciones-evaluador', {
        solicitud_id: Number(form.solicitud_id),
        evaluador_id: Number(form.evaluador_id),
        fecha_limite: form.fecha_limite,
      });
      setShowModal(false);
      setForm(emptyForm);
      setFeedback({ type: 'success', message: 'Evaluador asignado. Ya ve la solicitud en su bandeja.' });
      router.refresh();
    } catch (err: unknown) {
      setErrorGuardar(erroresFormulario(err,
        { solicitud_id: 'Solicitud', evaluador_id: 'Evaluador', fecha_limite: 'Fecha límite' },
        { solicitud_id: 'solicitud', evaluador_id: 'evaluador', fecha_limite: 'fecha' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <PageHeader
        title="Revisores y evaluadores"
        description="Quién revisa los documentos y quién dictamina cada proyecto. Desde aquí asignas un evaluador a una solicitud."
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={() => abrir(emptyForm)}>
            <UserPlus className="h-4 w-4" /> Asignar evaluador
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <ClipboardCheck className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Evaluadores ({evaluadores.length})
          </CardTitle>
          <CardDescription>Personas que califican los proyectos con los criterios de cada convocatoria.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluadores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="empty-state">
                      <span className="tone-chip" data-tone="violet"><ClipboardCheck aria-hidden="true" /></span>
                      <p className="font-bold text-[var(--app-ink)]">Sin evaluadores todavía</p>
                      <p className="text-sm text-[var(--app-ink-2)]">Crea usuarios con el papel de evaluador desde Usuarios.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : evaluadores.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell className="font-semibold">{ev.name}</TableCell>
                  <TableCell className="text-[var(--app-ink-2)]">{ev.email}</TableCell>
                  <TableCell><span className="pill" data-tone="sky">Evaluador</span></TableCell>
                  <TableCell className="text-right">
                    <Button variant="soft" size="sm"
                      onClick={() => abrir({ ...emptyForm, evaluador_id: String(ev.id) })}>
                      <Link2 /> Asignar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Users className="h-4 w-4" style={{ color: 'var(--tile-gold-fg)' }} /> Revisores ({revisores.length})
          </CardTitle>
          <CardDescription>Personas que revisan que la documentación de cada solicitud esté completa.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Papel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="empty-state">
                      <span className="tone-chip" data-tone="violet"><Users aria-hidden="true" /></span>
                      <p className="font-bold text-[var(--app-ink)]">Sin revisores todavía</p>
                      <p className="text-sm text-[var(--app-ink-2)]">Crea usuarios con el papel de revisor desde Usuarios.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : revisores.map((rv) => (
                <TableRow key={rv.id}>
                  <TableCell className="font-semibold">{rv.name}</TableCell>
                  <TableCell className="text-[var(--app-ink-2)]">{rv.email}</TableCell>
                  <TableCell><span className="pill" data-tone="gold">Revisor</span></TableCell>
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
        error={errorGuardar ? <AvisoErrores errores={errorGuardar} /> : null}
        errorStep={errorGuardar?.paso ?? null}
        submitting={saving}
        submitLabel="Asignar"
      />
    </div>
  );
}
