'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/ui/page-header';
import { Users, UserPlus, Link2, ClipboardCheck, AlertTriangle, Ban } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mensajeError } from '@/lib/errores-formulario';
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

/** E72 paso 5: indicadores de conflicto de interés (los calcula el servidor: GET /admin/solicitudes/{id}/candidatos-evaluador). */
interface Conflicto { tipo: string; bloqueante: boolean; detalle: string }
interface Candidato { id: number; name: string; ya_asignado: boolean; bloqueante: boolean; conflictos: Conflicto[] }

const ETIQUETA_CONFLICTO: Record<string, string> = {
  propia: 'Su propia solicitud', bloqueado: 'Bloqueado', misma_empresa: 'Misma empresa',
  misma_institucion: 'Misma institución', participa_convocatoria: 'Participa en la convocatoria', evaluo_antes: 'Ya evaluó al solicitante',
};

function leerCandidatos(data: unknown): Candidato[] {
  if (!Array.isArray(data)) return [];
  return data.filter((c) => typeof c?.id === 'number' && typeof c?.name === 'string').map((c) => ({
    id: c.id, name: c.name, ya_asignado: Boolean(c.ya_asignado), bloqueante: Boolean(c.bloqueante),
    conflictos: Array.isArray(c.conflictos) ? c.conflictos.filter((x: Conflicto) => typeof x?.tipo === 'string').map((x: Conflicto) => ({
      tipo: x.tipo, bloqueante: Boolean(x.bloqueante), detalle: String(x.detalle ?? ''),
    })) : [],
  }));
}

export function ChipsConflicto({ conflictos }: { conflictos: Conflicto[] }) {
  if (conflictos.length === 0) return <span className="pill" data-tone="emerald">Sin conflictos</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {conflictos.map((c) => (
        <span key={c.tipo} className="pill" data-tone={c.bloqueante ? 'red' : 'gold'} title={c.detalle}>
          {c.bloqueante ? <Ban className="h-3 w-3" aria-hidden="true" /> : <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
          {ETIQUETA_CONFLICTO[c.tipo] ?? c.tipo}
        </span>
      ))}
    </span>
  );
}

export default function EvaluadoresClient({ evaluadores, revisores, solicitudes }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  // Error al guardar: dentro de la ventana y en el paso del campo (antes quedaba detrás del modal, sin verse).
  const [errorGuardar, setErrorGuardar] = useState<ErroresFormulario | null>(null);
  const abrir = (f: typeof emptyForm) => { setForm(f); setErrorGuardar(null); setShowModal(true); };
  // Solo se asignan solicitudes que ya pasaron la revisión documental (el servidor lo vuelve a exigir).
  const enEvaluacion = solicitudes.filter((s) => s.estado === 'en_evaluacion');

  // Candidatos con sus conflictos para la solicitud elegida
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  useEffect(() => {
    if (!form.solicitud_id) { setCandidatos(null); return; }
    let vivo = true;
    setCandidatos(null);
    api.get(`/admin/solicitudes/${Number(form.solicitud_id)}/candidatos-evaluador`)
      .then(({ data }) => { if (vivo) setCandidatos(leerCandidatos(data)); })
      .catch(() => { if (vivo) setCandidatos([]); });
    return () => { vivo = false; };
  }, [form.solicitud_id]);
  const candidatoElegido = candidatos?.find((c) => String(c.id) === form.evaluador_id);

  // Conflictos que devolvió el servidor (409): el admin decide asignar de todos modos o bloquear
  const [conflictos, setConflictos] = useState<Conflicto[] | null>(null);
  const [bloqueo, setBloqueo] = useState<{ alcance: 'solicitud' | 'convocatoria'; motivo: string } | null>(null);
  const [errorConflicto, setErrorConflicto] = useState('');

  const handleAsignar = async (aceptoConflictos = false) => {
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
        ...(aceptoConflictos ? { acepto_conflictos: true } : {}),
      });
      setShowModal(false);
      setConflictos(null);
      setForm(emptyForm);
      setFeedback({ type: 'success', message: 'Evaluador asignado. Ya ve la solicitud en su panel de evaluación.' });
      router.refresh();
    } catch (err: unknown) {
      const r = (err as { response?: { status?: number; data?: { conflictos?: unknown } } })?.response;
      if (r?.status === 409 && Array.isArray(r.data?.conflictos)) {
        setConflictos(leerCandidatos([{ id: 0, name: '-', conflictos: r.data.conflictos }])[0].conflictos);
        setBloqueo(null);
        setErrorConflicto('');
      } else {
        setErrorGuardar(erroresFormulario(err,
          { solicitud_id: 'Solicitud', evaluador_id: 'Evaluador', fecha_limite: 'Fecha límite' },
          { solicitud_id: 'solicitud', evaluador_id: 'evaluador', fecha_limite: 'fecha' }));
      }
    } finally {
      setSaving(false);
    }
  };

  const bloquear = async () => {
    if (!bloqueo) return;
    if (bloqueo.motivo.trim().length < 5) { setErrorConflicto('Escribe el motivo (al menos 5 caracteres).'); return; }
    setSaving(true);
    try {
      const { data } = await api.post(`/admin/solicitudes/${Number(form.solicitud_id)}/bloquear-evaluador`, {
        evaluador_id: Number(form.evaluador_id), alcance: bloqueo.alcance, motivo: bloqueo.motivo.trim(),
      });
      setConflictos(null);
      setShowModal(false);
      setForm(emptyForm);
      setFeedback({ type: 'info', message: typeof data?.message === 'string' ? data.message : 'Evaluador bloqueado.' });
    } catch (err) {
      setErrorConflicto(mensajeError(err, 'No se pudo bloquear.'));
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
                <Label htmlFor="asig-solicitud" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Solicitud <Asterisco /></Label>
                <select id="asig-solicitud" value={form.solicitud_id} onChange={e => setForm({ ...form, solicitud_id: e.target.value })} className="auth-input auth-input-static pl-4">
                  <option value="">Elige una solicitud…</option>
                  {enEvaluacion.map((s) => (
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
                <Label htmlFor="asig-evaluador" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Evaluador <Asterisco /></Label>
                <select id="asig-evaluador" value={form.evaluador_id} onChange={e => setForm({ ...form, evaluador_id: e.target.value })} className="auth-input auth-input-static pl-4">
                  <option value="">Elige un evaluador…</option>
                  {(candidatos ?? evaluadores.map((ev) => ({ id: ev.id, name: ev.name, ya_asignado: false, bloqueante: false, conflictos: [] as Conflicto[] }))).map((ev) => (
                    <option key={ev.id} value={ev.id} disabled={ev.ya_asignado || ev.bloqueante}>
                      {ev.name}{ev.ya_asignado ? ' (ya asignado)' : ev.bloqueante ? ' (no se puede asignar)' : ev.conflictos.length ? ' (con avisos)' : ''}
                    </option>
                  ))}
                </select>
                {candidatos === null && form.solicitud_id && <p className="text-xs text-[var(--app-ink-2)]">Revisando conflictos de interés…</p>}
                {candidatoElegido && (
                  <div className="rounded-xl border border-[var(--app-line,#e5e5e5)] p-3 text-sm space-y-2">
                    <p className="font-semibold">Conflictos de interés</p>
                    <ChipsConflicto conflictos={candidatoElegido.conflictos} />
                    {candidatoElegido.conflictos.map((c) => <p key={c.tipo} className="text-xs text-[var(--app-ink-2)]">{c.detalle}</p>)}
                    {candidatoElegido.conflictos.length > 0 && !candidatoElegido.bloqueante && (
                      <p className="text-xs text-[var(--app-ink-2)]">Al asignar te pediremos confirmar si deseas continuar o bloquearlo.</p>
                    )}
                  </div>
                )}
                {candidatos && candidatos.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold text-[var(--app-ink-2)]">Ver avisos de todos los evaluadores</summary>
                    <ul className="mt-2 grid gap-2">
                      {candidatos.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2"><span>{c.name}{c.ya_asignado ? ' · ya asignado' : ''}</span><ChipsConflicto conflictos={c.conflictos} /></li>
                      ))}
                    </ul>
                  </details>
                )}
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
                <Label htmlFor="asig-fecha" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Fecha límite <Asterisco /></Label>
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
        onSubmit={() => handleAsignar(false)}
        error={errorGuardar ? <AvisoErrores errores={errorGuardar} /> : null}
        errorStep={errorGuardar?.paso ?? null}
        submitting={saving}
        submitLabel="Asignar"
      />

      {/* 409: hay conflictos que no bloquean por sí solos; el admin decide */}
      <Dialog open={conflictos !== null} onOpenChange={(o) => { if (!o) setConflictos(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Posibles conflictos de interés</DialogTitle>
            <DialogDescription>Revisa los avisos y decide si asignas de todos modos o bloqueas a esta persona.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <ChipsConflicto conflictos={conflictos ?? []} />
            <ul className="list-disc pl-5 text-[var(--app-ink-2)]">{(conflictos ?? []).map((c) => <li key={c.tipo}>{c.detalle}</li>)}</ul>
            {bloqueo && (
              <div className="space-y-2 rounded-xl border border-[var(--app-line,#e5e5e5)] p-3">
                <fieldset className="flex flex-wrap gap-4">
                  <legend className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Bloquear para</legend>
                  <label className="flex items-center gap-2"><input type="radio" name="alcance" checked={bloqueo.alcance === 'solicitud'} onChange={() => setBloqueo({ ...bloqueo, alcance: 'solicitud' })} />Esta solicitud</label>
                  <label className="flex items-center gap-2"><input type="radio" name="alcance" checked={bloqueo.alcance === 'convocatoria'} onChange={() => setBloqueo({ ...bloqueo, alcance: 'convocatoria' })} />Toda la convocatoria</label>
                </fieldset>
                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Motivo <Asterisco /></span>
                  <textarea rows={3} maxLength={500} value={bloqueo.motivo} onChange={(e) => setBloqueo({ ...bloqueo, motivo: e.target.value })} className="auth-input auth-input-static pl-4" />
                </label>
              </div>
            )}
            {errorConflicto && <p role="alert" className="text-sm text-red-700">{errorConflicto}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {bloqueo ? (
              <>
                <Button variant="outline" onClick={() => setBloqueo(null)}>Volver</Button>
                <Button variant="destructive" onClick={bloquear} disabled={saving}><Ban className="h-4 w-4" /> Bloquear</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setBloqueo({ alcance: 'solicitud', motivo: '' })}><Ban className="h-4 w-4" /> No asignar y bloquear</Button>
                <Button onClick={() => handleAsignar(true)} disabled={saving}>Asignar de todos modos</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
