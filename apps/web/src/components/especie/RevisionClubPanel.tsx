'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, MessageSquareWarning, XCircle, TimerReset, BadgeCheck, Gavel, ClipboardCheck, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import StepFrame from '@/components/ui/step-frame';
import AvisoErrores from '@/components/ui/aviso-errores';
import CuentaRegresiva from '@/components/especie/CuentaRegresiva';
import { erroresFormulario, type ErroresFormulario } from '@/lib/errores-formulario';
import { REVISA_ETIQUETA, type AvanceClub } from '@/lib/especie';

export interface PermisosRevision {
  resolver: boolean; observar: boolean; rechazar: boolean; prorroga: boolean; visto_bueno: boolean; comite: boolean; acta: boolean;
}

type Accion = 'aprobar' | 'observar' | 'rechazar' | 'prorroga' | 'comite_aceptado' | 'comite_no_aceptado' | null;

const TEXTO: Record<Exclude<Accion, null>, { titulo: string; pregunta: string; boton: string; comentario: string; obligatorio: boolean }> = {
  aprobar: { titulo: 'Aprobar la etapa', pregunta: '¿El club cumple con esta etapa?', boton: 'Aprobar etapa', comentario: 'Comentario (opcional)', obligatorio: false },
  observar: { titulo: 'Pedir correcciones', pregunta: '¿Qué debe corregir el líder?', boton: 'Enviar observaciones', comentario: 'Qué debe corregir *', obligatorio: true },
  rechazar: { titulo: 'Rechazar el club', pregunta: '¿Por qué no continúa?', boton: 'Rechazar club', comentario: 'Motivo del rechazo *', obligatorio: true },
  prorroga: { titulo: 'Dar prórroga', pregunta: '¿Cuánto tiempo más tiene para corregir?', boton: 'Dar prórroga', comentario: 'Motivo *', obligatorio: true },
  comite_aceptado: { titulo: 'Comité: aceptado', pregunta: '¿El comité aceptó este club?', boton: 'Marcar aceptado', comentario: 'Nota (opcional)', obligatorio: false },
  comite_no_aceptado: { titulo: 'Comité: no aceptado', pregunta: '¿El comité no aceptó este club?', boton: 'Marcar no aceptado', comentario: 'Motivo (opcional, lo verá el líder)', obligatorio: false },
};

/**
 * E52 · F2 — Acciones del personal sobre un club según su estado y los permisos que calculó el servidor: resolver la
 * etapa (aprobar / pedir correcciones / rechazar), prórroga de un plazo vencido, visto bueno y decisión del comité.
 * Los errores del servidor se muestran dentro de la ventana (patrón E53).
 */
export default function RevisionClubPanel({ clubId, estado, avance, permisos, hayActa, convocatoriaId, onHecho }: {
  clubId: number; estado: string; avance: Partial<AvanceClub>; permisos: PermisosRevision; hayActa: boolean; convocatoriaId: number;
  onHecho: (detalle: unknown, mensaje: string) => void;
}) {
  const [accion, setAccion] = useState<Accion>(null);
  const [comentario, setComentario] = useState('');
  const [horas, setHoras] = useState(24);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErroresFormulario | null>(null);

  const abrir = (a: Accion) => { setAccion(a); setComentario(''); setHoras(avance.etapa_actual?.plazo_horas ?? 24); setError(null); };

  const ejecutar = async (a: Exclude<Accion, null> | 'visto_bueno') => {
    setEnviando(true);
    setError(null);
    try {
      let r;
      if (a === 'visto_bueno') r = await api.post(`/revision/clubes/${clubId}/visto-bueno`);
      else if (a === 'prorroga') r = await api.post(`/revision/clubes/${clubId}/prorroga`, { horas, motivo: comentario.trim() });
      else if (a === 'comite_aceptado' || a === 'comite_no_aceptado') r = await api.post(`/revision/clubes/${clubId}/comite`, { resultado: a === 'comite_aceptado' ? 'aceptado' : 'no_aceptado', motivo: comentario.trim() || null });
      else r = await api.post(`/revision/clubes/${clubId}/resolver`, { resultado: a, comentario: comentario.trim() || null });
      const mensajes: Record<string, string> = {
        aprobar: 'Etapa aprobada.', observar: 'Observaciones enviadas: el líder recibió aviso y correo con su plazo.', rechazar: 'Club rechazado; el líder recibió aviso.',
        prorroga: 'Prórroga dada: el líder recibió aviso y correo con el nuevo plazo.', visto_bueno: 'Visto bueno registrado.',
        comite_aceptado: '¡Club aceptado! El líder recibió aviso y correo.', comite_no_aceptado: 'Registrado como no aceptado; el líder recibió aviso.',
      };
      setAccion(null);
      onHecho(r.data, mensajes[a]);
    } catch (e) {
      const r = erroresFormulario(e, { comentario: 'Comentario', motivo: 'Motivo', horas: 'Horas', club: 'Club' }, {});
      setError(r);
      if (a === 'visto_bueno') onHecho(null, `No se registró el visto bueno. ${r.lineas.join(' ') || r.titulo}`);
    } finally {
      setEnviando(false);
    }
  };

  const t = accion ? TEXTO[accion] : null;
  const etapa = avance.etapa_actual;
  const nada = !permisos.resolver && !permisos.rechazar && !permisos.prorroga && !permisos.visto_bueno && !permisos.comite;

  return (
    <section className="app-card space-y-4 p-5" aria-labelledby="rev-acciones">
      <h2 id="rev-acciones" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><ClipboardCheck className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Revisión</h2>

      {etapa && (
        <p className="text-sm text-[var(--app-ink)]">
          Etapa {etapa.orden}{avance.etapas?.length ? ` de ${avance.etapas.length}` : ''}: <strong>{etapa.nombre}</strong>
          <span className="text-[var(--app-ink-2)]"> · revisa {REVISA_ETIQUETA[etapa.revisa]?.toLowerCase()} · correcciones usadas {avance.ronda ?? 0} de {etapa.max_subsanaciones}</span>
        </p>
      )}
      {(estado === 'observado' || estado === 'vencido') && avance.vence_at && (
        <div className="space-y-1">
          <p className="text-sm text-[var(--app-ink-2)]">Esperando las correcciones del líder.</p>
          <CuentaRegresiva vence={avance.vence_at} />
        </div>
      )}
      {estado === 'aprobado_revision' && (
        <ul className="space-y-1 text-sm">
          <li className="flex items-center gap-2">{avance.visto_bueno_at ? <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--tile-emerald-fg)' }} aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border-2" style={{ borderColor: 'var(--app-rule)' }} aria-hidden="true" />}
            Visto bueno del admin de convocatoria {avance.visto_bueno_at ? '(listo)' : '(pendiente)'}</li>
          <li className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2" style={{ borderColor: 'var(--app-rule)' }} aria-hidden="true" />
            Decisión del comité {hayActa ? '(acta cargada)' : '(falta subir el acta)'}</li>
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {permisos.resolver && <Button onClick={() => abrir('aprobar')}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Aprobar etapa</Button>}
        {permisos.observar && <Button variant="outline" onClick={() => abrir('observar')}><MessageSquareWarning className="h-4 w-4" aria-hidden="true" />Pedir correcciones</Button>}
        {permisos.prorroga && <Button onClick={() => abrir('prorroga')}><TimerReset className="h-4 w-4" aria-hidden="true" />Dar prórroga</Button>}
        {permisos.rechazar && <Button variant="destructive" onClick={() => abrir('rechazar')}><XCircle className="h-4 w-4" aria-hidden="true" />Rechazar</Button>}
        {permisos.visto_bueno && (
          <Button onClick={() => void ejecutar('visto_bueno')} disabled={enviando}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" aria-hidden="true" />}Dar visto bueno
          </Button>
        )}
        {permisos.comite && <>
          <Button onClick={() => abrir('comite_aceptado')}><Gavel className="h-4 w-4" aria-hidden="true" />Comité: aceptado</Button>
          <Button variant="destructive" onClick={() => abrir('comite_no_aceptado')}>Comité: no aceptado</Button>
        </>}
      </div>
      {permisos.resolver && !permisos.observar && etapa && (
        <p className="text-xs text-[var(--app-ink-2)]">Esta etapa ya usó sus correcciones permitidas: solo queda aprobar o rechazar.</p>
      )}
      {estado === 'aprobado_revision' && avance.visto_bueno_at && !hayActa && permisos.acta && (
        <p className="text-sm text-[var(--app-ink)]">Para registrar la decisión del comité, primero <Link className="font-semibold underline" href={`/admin/clubes?convocatoria=${convocatoriaId}`}>sube el acta de la convocatoria</Link>.</p>
      )}
      {nada && !['observado', 'vencido', 'aprobado_revision'].includes(estado) && (
        <p className="text-sm text-[var(--app-ink-2)]">{estado === 'aceptado' ? 'Club aceptado.' : estado === 'kit_entregado' ? 'Club aceptado; kit entregado.' : estado === 'rechazado' ? 'Club no aceptado.' : estado === 'borrador' ? 'El líder aún no envía el club.' : 'Esta etapa la resuelve otro rol.'}</p>
      )}

      <StepFrame
        open={accion !== null}
        size="md"
        title={t?.titulo ?? ''}
        icon={<ClipboardCheck className="h-5 w-5" />}
        intro={accion === 'observar' ? <>El líder tendrá <strong>{etapa?.plazo_horas ?? 24} horas</strong> para corregir y recibirá tu comentario por aviso y correo.</>
          : accion === 'rechazar' || accion === 'comite_no_aceptado' ? <>El club <strong>no continuará</strong>. El líder recibirá el aviso.</> : undefined}
        onClose={() => setAccion(null)}
        onSubmit={() => (accion ? ejecutar(accion) : undefined)}
        submitting={enviando}
        submitLabel={t?.boton}
        error={error ? <AvisoErrores errores={error} /> : null}
        steps={accion && t ? [{
          key: 'accion',
          label: t.titulo,
          question: t.pregunta,
          validate: () => (t.obligatorio && !comentario.trim() ? `Escribe el ${accion === 'observar' ? 'comentario para el líder' : 'motivo'}.` : accion === 'prorroga' && (!Number.isInteger(horas) || horas < 1 || horas > 168) ? 'Las horas van de 1 a 168.' : null),
          content: (
            <div className="space-y-4">
              {accion === 'prorroga' && (
                <div className="space-y-1.5">
                  <label htmlFor="rev-horas" className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Horas adicionales *</label>
                  <input id="rev-horas" type="number" min={1} max={168} inputMode="numeric" value={Number.isNaN(horas) ? '' : horas}
                    onChange={(e) => setHoras(Math.trunc(Number(e.target.value)))} className="auth-input auth-input-static pl-4" />
                  <p className="text-xs text-[var(--app-ink-2)]">De 1 a 168 (7 días). Cuentan desde ahora, en horas naturales.</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="rev-comentario" className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">{t.comentario}</label>
                <textarea id="rev-comentario" maxLength={3000} value={comentario} onChange={(e) => setComentario(e.target.value)}
                  className="auth-input auth-input-static !h-auto min-h-[120px] resize-y py-3 pl-4" />
                <p className="text-xs text-[var(--app-ink-2)]">{comentario.length} / 3000</p>
              </div>
            </div>
          ),
        }] : []}
      />
    </section>
  );
}
