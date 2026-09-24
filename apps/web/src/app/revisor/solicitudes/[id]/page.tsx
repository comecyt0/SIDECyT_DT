'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Eye, CheckCircle,
  FileText, Building2, BookOpen, CalendarDays,
  FilePlus, Trash2, Send, FileCheck, ShieldCheck, CheckSquare
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';
import PageHeader from '@/components/ui/page-header';
import { DocumentosAdjuntos } from '@/components/solicitante/DocumentosAdjuntos';
import type { Solicitud, Observacion } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { parseDate } from '@/lib/format';
import { safeUrl } from '@/lib/safe-url';

interface ProgramaCampo {
  id: string;
  label: string;
}

export default function RevisorDetalleSolicitudPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  // ✅ Separar observaciones existentes (de BD) de nuevas (siendo preparadas)
  const [existingObservaciones, setExistingObservaciones] = useState<Observacion[]>([]);
  const [newObservaciones, setNewObservaciones] = useState<{campo: string, comentario: string, tipo: string}[]>([]);
  const [newObs, setNewObs] = useState({ campo: '', comentario: '', tipo: 'documental' });
  const [submitting, setSubmitting] = useState<'aprobar' | 'observar' | null>(null);
  const [camposPrograma, setCamposPrograma] = useState<ProgramaCampo[]>([]);
  const [obsError, setObsError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; description: string; onConfirm: () => void}>({
    open: false, title: '', description: '', onConfirm: () => {}
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get(`/revisor/solicitudes/${id}`);
        setSolicitud(data);
        // ✅ Cargar observaciones existentes desde BD
        const existing = Array.isArray(data.observaciones) ? data.observaciones : [];
        setExistingObservaciones(existing);

        // Cargar campos y documentos dinámicos del programa
        const tipoProgramaId = data.convocatoria?.tipo_programa_id;
        if (tipoProgramaId) {
          try {
            const [camposRes, docsRes] = await Promise.all([
              api.get(`/catalogs/programa/${tipoProgramaId}/campos`).catch(() => ({ data: [] })),
              api.get(`/catalogs/programa/${tipoProgramaId}/documentos`).catch(() => ({ data: [] }))
            ]);

            // Handle both { data: [...] } and direct array responses
            const camposData = Array.isArray(camposRes.data)
              ? camposRes.data
              : Array.isArray(camposRes.data?.data)
              ? camposRes.data.data
              : [];

            const docsData = Array.isArray(docsRes.data)
              ? docsRes.data
              : Array.isArray(docsRes.data?.data)
              ? docsRes.data.data
              : [];

            // Map campos (if they exist)
            const campos = camposData.length > 0
              ? camposData.map((c: any) => ({ id: c.nombre_campo || c.id, label: c.etiqueta || c.nombre || c.nombre_campo }))
              : [];

            // Map documentos
            const docs = docsData.map((d: any) => ({ id: d.clave, label: d.nombre }));

            // Combine all options
            const allOptions = [
              ...campos,
              ...docs,
              { id: 'otros', label: 'Otros / General' }
            ];
            setCamposPrograma(allOptions);
          } catch (err) {
            console.error('Error loading programa datos:', err);
            setCamposPrograma([{ id: 'otros', label: 'Otros / General' }]);
          }
        }
      } catch {
        router.push('/revisor/solicitudes');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  const addObservacion = () => {
    // Validar campo requerido
    if (!newObs.campo || !newObs.campo.trim()) {
      setObsError('Debes seleccionar un campo para la observación');
      return;
    }
    // Validar comentario requerido
    if (!newObs.comentario || !newObs.comentario.trim()) {
      setObsError('El comentario es obligatorio (mínimo 10 caracteres)');
      return;
    }
    if (newObs.comentario.trim().length < 10) {
      setObsError('El comentario debe tener al menos 10 caracteres');
      return;
    }
    setObsError(null);
    setNewObservaciones([...newObservaciones, { ...newObs }]);
    setNewObs({ campo: '', comentario: '', tipo: 'documental' });
  };

  const removeObservacion = (index: number) => {
    setNewObservaciones(newObservaciones.filter((_, i) => i !== index));
  };

  const handleAprobar = () => {
    setConfirmState({
      open: true,
      title: 'Turnar a evaluación técnica',
      description: '¿Confirmas turnar esta solicitud a evaluación técnica? Esta acción no se puede revertir.',
      onConfirm: async () => {
        setSubmitting('aprobar');
        try {
          await api.post(`/revisor/solicitudes/${id}/aprobar`);
          setFeedback({ type: 'success', message: 'La solicitud ya está en evaluación técnica.' });
          setTimeout(() => router.push('/revisor/solicitudes'), 1500);
        } catch (error) {
          const errorMsg = error instanceof Error
            ? (error as any).response?.data?.error || error.message
            : 'No se pudo aprobar la solicitud.';
          setFeedback({ type: 'error', message: errorMsg });
        } finally {
          setSubmitting(null);
        }
      },
    });
  };

  const handleObservar = () => {
    if (newObservaciones.length === 0) {
      setFeedback({ type: 'warning', message: 'Agrega al menos una observación antes de enviar.' });
      return;
    }
    setConfirmState({
      open: true,
      title: 'Enviar observaciones',
      description: `¿Confirmas enviar estas ${newObservaciones.length} observaciones al solicitante?`,
      onConfirm: async () => {
        setSubmitting('observar');
        try {
          await api.post(`/revisor/solicitudes/${id}/observar`, { observaciones: newObservaciones });
          setFeedback({ type: 'success', message: 'Las observaciones se enviaron. El solicitante recibirá un aviso.' });
          setTimeout(() => router.push('/revisor/solicitudes'), 1500);
        } catch (error) {
          const errorMsg = error instanceof Error
            ? (error as any).response?.data?.error || error.message
            : 'No se pudieron enviar las observaciones.';
          setFeedback({ type: 'error', message: errorMsg });
        } finally {
          setSubmitting(null);
        }
      },
    });
  };

  const handleAprobarInforme = () => {
    setConfirmState({
      open: true,
      title: 'Aprobar informe final',
      description: '¿Confirmas que el informe final cumple con todos los requisitos? El proyecto quedará cerrado.',
      onConfirm: async () => {
        setSubmitting('aprobar');
        try {
          await api.post(`/revisor/solicitudes/${id}/aprobar-informe`);
          setFeedback({ type: 'success', message: 'El informe final quedó aprobado y el proyecto cerrado.' });
          setTimeout(() => router.push('/revisor/solicitudes'), 1500);
        } catch (error) {
          const errorMsg = error instanceof Error
            ? (error as any).response?.data?.error || error.message
            : 'No se pudo aprobar el informe.';
          setFeedback({ type: 'error', message: errorMsg });
        } finally {
          setSubmitting(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-[var(--auth-vino)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!solicitud) return null;

  const labelClass = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
  const rowClass = 'flex justify-between gap-4 border-b border-[var(--app-rule)] pb-2';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="default"
      />

      <PageHeader
        backHref="/revisor/solicitudes"
        backLabel="Volver a la bandeja"
        eyebrow={solicitud.folio}
        title={solicitud.titulo_proyecto}
        description="Revisa los datos y documentos, y decide si la solicitud continúa o regresa con observaciones."
        actions={
          <span className={`${estadoBadgeClass(solicitud.estado)} !text-sm !px-3`}>
            {estadoLabel(solicitud.estado)}
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Datos del proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className={rowClass}>
              <span className="text-[var(--app-ink-2)] font-medium">Modalidad</span>
              <span className="font-semibold text-[var(--app-ink)] text-right">{solicitud.modalidad}</span>
            </div>
            <div className={rowClass}>
              <span className="text-[var(--app-ink-2)] font-medium">Convocatoria</span>
              <span className="font-semibold text-[var(--app-ink)] text-right">{solicitud.convocatoria?.nombre || '—'}</span>
            </div>
            <div className={rowClass}>
              <span className="text-[var(--app-ink-2)] font-medium">Monto solicitado</span>
              <span className="font-bold" style={{ color: 'var(--auth-vino)' }}>${Number(solicitud.monto_solicitado).toLocaleString()} MXN</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--app-ink-2)] font-medium">Etapa actual</span>
              <Badge variant="outline" className="capitalize">{solicitud.etapa_actual || 'Revisión'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Building2 className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Institución solicitante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className={rowClass}>
              <span className="text-[var(--app-ink-2)] font-medium">Institución</span>
              <span className="font-semibold text-[var(--app-ink)] text-right">{solicitud.user?.name || solicitud.empresa?.nombre || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--app-ink-2)] font-medium">Fecha de envío</span>
              <span className="font-medium flex items-center gap-1.5 text-[var(--app-ink)]">
                <CalendarDays className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />
                {solicitud.created_at ? new Date(solicitud.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <BookOpen className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Resumen del proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--app-ink)] leading-relaxed whitespace-pre-wrap">{solicitud.descripcion_proyecto || solicitud.resumen || 'El solicitante no escribió una descripción.'}</p>
        </CardContent>
      </Card>

      {solicitud.convocatoria?.tipo_programa_id && (
        <DocumentosAdjuntos
          solicitudId={parseInt(id)}
          tipoProgramaId={solicitud.convocatoria.tipo_programa_id}
          documentos={solicitud.documentos || []}
          readonly={true}
        />
      )}

      {existingObservaciones.length > 0 && (
        <Card style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
          <CardHeader>
            <CardTitle>
              <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Observaciones anteriores ({existingObservaciones.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {existingObservaciones.map((obs, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-[14px] bg-[var(--app-card-bg)] border border-[var(--app-rule)]">
                <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: 'var(--tile-gold-bg)', color: 'var(--tile-gold-fg)' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={labelClass}>{obs.campo || 'General'}</p>
                  <p className="text-sm text-[var(--app-ink)] mt-1 leading-relaxed">{obs.comentario}</p>
                  {obs.respuesta_solicitante && (
                    <div className="mt-3 p-3 rounded-[10px]" style={{ backgroundColor: 'var(--tile-emerald-bg)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: 'var(--tile-emerald-fg)' }}>Respuesta del solicitante</p>
                      <p className="text-xs text-[var(--app-ink)]">{obs.respuesta_solicitante}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {solicitud.estado_informe === 'entregado' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <CheckCircle className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Validación del informe final
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[14px] bg-[var(--auth-field)]">
               <div className="flex items-center gap-3 min-w-0">
                 <span className="app-tile-icon shrink-0" style={{ color: 'var(--tile-sky-fg)' }}><FileText className="h-5 w-5" /></span>
                 <div className="min-w-0">
                   <p className="text-sm font-bold text-[var(--app-ink)]">Informe final entregado</p>
                   <p className="text-xs text-[var(--app-ink-2)]">Recibido el {solicitud.fecha_entrega_informe ? parseDate(solicitud.fecha_entrega_informe).toLocaleDateString('es-MX') : '—'}</p>
                 </div>
               </div>
               {safeUrl(solicitud.informe_final_url) && (
                 <Link href={safeUrl(solicitud.informe_final_url)!} target="_blank" rel="noopener noreferrer" className="shrink-0">
                   <Button variant="soft" size="sm">
                     <Eye className="h-4 w-4" /> Abrir el documento
                   </Button>
                 </Link>
               )}
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
              <Button variant="outline">Pedir correcciones</Button>
              <Button
                onClick={handleAprobarInforme}
                disabled={submitting !== null}
              >
                Aprobar y cerrar el proyecto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>
              <FilePlus className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Nueva observación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="obs-campo" className={labelClass}>Campo a observar</label>
              <select
                id="obs-campo"
                className="auth-input auth-input-static pl-4"
                value={newObs.campo}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedField = camposPrograma.find(c => c.id === selectedId);
                  setNewObs({...newObs, campo: selectedField?.label || selectedId});
                }}
              >
                <option value="">Elige un campo…</option>
                {camposPrograma.length > 0 ? (
                  camposPrograma.map(c => <option key={c.id} value={c.id}>{c.label}</option>)
                ) : (
                  <option value="otros">Otros / General</option>
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="obs-comentario" className={labelClass}>Comentario</label>
              <textarea
                id="obs-comentario"
                placeholder="Explica qué debe corregir el solicitante."
                className="auth-input auth-input-static pl-4 !h-auto min-h-[100px] py-3 resize-y"
                value={newObs.comentario}
                onChange={(e) => setNewObs({...newObs, comentario: e.target.value})}
              />
            </div>
            <Button
              className="w-full"
              onClick={addObservacion}
              disabled={!newObs.comentario.trim()}
            >
              Agregar a la lista
            </Button>

            {obsError && (
              <div className="rounded-[14px] px-4 py-3 text-sm font-medium" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-danger)' }}>
                {obsError}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <CheckSquare className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Observaciones por enviar ({newObservaciones.length})
            </CardTitle>
            {newObservaciones.length > 0 && (
              <CardAction>
                <Badge variant="outline">Pendientes de enviar</Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {newObservaciones.length === 0 ? (
              <div className="empty-state">
                <span className="tone-chip" data-tone="emerald"><ShieldCheck aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">No hay observaciones nuevas</p>
                <p className="text-sm text-[var(--app-ink-2)]">Si la solicitud está completa, puedes turnarla a evaluación técnica.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newObservaciones.map((obs, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-[14px] animate-in slide-in-from-right-2 duration-300" style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
                    <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold bg-[var(--app-card-bg)]" style={{ color: 'var(--tile-gold-fg)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={labelClass}>{obs.campo}</p>
                      <p className="text-sm text-[var(--app-ink)] mt-1 leading-relaxed">{obs.comentario}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      aria-label="Quitar esta observación"
                      title="Quitar esta observación"
                      onClick={() => removeObservacion(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-[var(--app-rule)] flex flex-col sm:flex-row sm:justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleObservar}
                disabled={submitting !== null || newObservaciones.length === 0}
              >
                {submitting === 'observar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar observaciones al solicitante
              </Button>
              <Button
                onClick={handleAprobar}
                disabled={submitting !== null || newObservaciones.length > 0}
              >
                {submitting === 'aprobar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                Turnar a evaluación técnica
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
