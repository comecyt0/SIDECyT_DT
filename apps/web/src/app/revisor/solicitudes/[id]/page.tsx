'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Loader2, Eye, CheckCircle,
  FileText, Building2, BookOpen, CalendarDays,
  FilePlus, Trash2, Send, FileCheck, ShieldCheck, CheckSquare
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { badgeColorMap, colorMap } from '@/lib/color-mapper';
import { DocumentosAdjuntos } from '@/components/solicitante/DocumentosAdjuntos';
import type { Solicitud, Observacion } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

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
      title: 'Turnar a Evaluación Técnica',
      description: '¿Confirmas turnar esta solicitud a Evaluación Técnica? Esta acción no se puede revertir.',
      onConfirm: async () => {
        setSubmitting('aprobar');
        try {
          await api.post(`/revisor/solicitudes/${id}/aprobar`);
          setFeedback({ type: 'success', message: 'Solicitud turnada a Evaluación Técnica exitosamente.' });
          setTimeout(() => router.push('/revisor/solicitudes'), 1500);
        } catch (error) {
          const errorMsg = error instanceof Error
            ? (error as any).response?.data?.error || error.message
            : 'Error al aprobar';
          setFeedback({ type: 'error', message: errorMsg });
        } finally {
          setSubmitting(null);
        }
      },
    });
  };

  const handleObservar = () => {
    if (newObservaciones.length === 0) {
      setFeedback({ type: 'warning', message: 'Debes agregar al menos una observación antes de enviar.' });
      return;
    }
    setConfirmState({
      open: true,
      title: 'Enviar Observaciones',
      description: `¿Confirmas enviar estas ${newObservaciones.length} observaciones al solicitante?`,
      onConfirm: async () => {
        setSubmitting('observar');
        try {
          await api.post(`/revisor/solicitudes/${id}/observar`, { observaciones: newObservaciones });
          setFeedback({ type: 'success', message: 'Observaciones enviadas con éxito. El solicitante será notificado.' });
          setTimeout(() => router.push('/revisor/solicitudes'), 1500);
        } catch (error) {
          const errorMsg = error instanceof Error
            ? (error as any).response?.data?.error || error.message
            : 'Error al generar observación';
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
      title: 'Aprobar Informe Final',
      description: '¿Confirmas que el informe final cumple con todos los requisitos? El proyecto se marcará como CERRADO.',
      onConfirm: async () => {
        setSubmitting('aprobar');
        try {
          await api.post(`/revisor/solicitudes/${id}/aprobar-informe`);
          setFeedback({ type: 'success', message: 'Informe final aprobado y proyecto cerrado.' });
          setTimeout(() => router.push('/revisor/solicitudes'), 1500);
        } catch (error) {
          const errorMsg = error instanceof Error
            ? (error as any).response?.data?.error || error.message
            : 'Error al aprobar informe';
          setFeedback({ type: 'error', message: errorMsg });
        } finally {
          setSubmitting(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!solicitud) return null;

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/revisor/solicitudes">
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <p className="text-sm font-mono text-neutral-500 dark:text-neutral-400">{solicitud.folio}</p>
          <h1 className="text-2xl font-bold text-neutral-dark leading-tight">{solicitud.titulo_proyecto}</h1>
        </div>
        <div className="ml-auto">
          <Badge variant={badgeColorMap[solicitud.estado as keyof typeof badgeColorMap] || 'default'} className="text-sm px-3 py-1">
            {solicitud.estado?.toUpperCase().replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
          <CardHeader className="pb-3 bg-neutral-50/50 border-b border-neutral-100 dark:border-neutral-700">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Datos del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Modalidad</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{solicitud.modalidad}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Convocatoria</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-right max-w-[200px]">{solicitud.convocatoria?.nombre || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Monto Solicitado</span>
              <span className="font-bold text-primary">${Number(solicitud.monto_solicitado).toLocaleString()} MXN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Etapa Actual</span>
              <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wider">{solicitud.etapa_actual || 'Revisión'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
          <CardHeader className="pb-3 bg-neutral-50/50 border-b border-neutral-100 dark:border-neutral-700">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Institución Postulante
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Institución</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-right">{solicitud.user?.name || solicitud.empresa?.nombre || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Fecha de Envío</span>
              <span className="font-medium flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200">
                <CalendarDays className="h-4 w-4 text-primary/60" />
                {solicitud.created_at ? new Date(solicitud.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen */}
      <Card className="border-0 shadow-sm ring-1 ring-neutral-100 border-l-4 border-l-primary overflow-hidden">
        <CardHeader className="pb-3 bg-neutral-50/30 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <BookOpen className="h-4 w-4" /> Resumen Ejecutivo del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">{solicitud.descripcion_proyecto || solicitud.resumen || 'Sin descripción proporcionada.'}</p>
        </CardContent>
      </Card>

      {/* Documentos del Solicitante */}
      {solicitud.convocatoria?.tipo_programa_id && (
        <DocumentosAdjuntos
          solicitudId={parseInt(id)}
          tipoProgramaId={solicitud.convocatoria.tipo_programa_id}
          documentos={solicitud.documentos || []}
          readonly={true}
        />
      )}

      {/* === OBSERVACIONES EXISTENTES (Ya Enviadas) === */}
      {existingObservaciones.length > 0 && (
        <Card className="border-0 shadow-lg ring-1 ring-neutral-100 bg-amber-50/40">
          <CardHeader className="bg-amber-100/50 border-b border-amber-200 py-4 pb-3">
            <CardTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" /> Observaciones Previas ({existingObservaciones.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            {existingObservaciones.map((obs, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-amber-200">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-amber-700">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">{obs.campo || 'General'}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 mt-1 leading-relaxed">{obs.comentario}</p>
                  {obs.respuesta_solicitante && (
                    <div className="mt-3 p-2 bg-green-50/40 border-l-2 border-green-400 rounded">
                      <p className="text-xs font-bold text-green-700 uppercase mb-1">Respuesta del Solicitante:</p>
                      <p className="text-xs text-green-900">{obs.respuesta_solicitante}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* === VALIDACIÓN DE INFORME FINAL === */}
      {solicitud.estado_informe === 'entregado' && (
        <Card className={`border-0 shadow-lg ring-2 ring-emerald-500/20 overflow-hidden bg-white dark:bg-neutral-900`}>
          <CardHeader className={`${colorMap.states.success.background} text-white py-4`}>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Validación de Informe Final de Resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700">
               <div className="flex items-center gap-3">
                 <FileText className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
                 <div>
                   <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">Reporte Final Entregado</p>
                   <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-medium">Fecha de recepción: {solicitud.fecha_entrega_informe ? new Date(solicitud.fecha_entrega_informe).toLocaleDateString() : 'N/A'}</p>
                 </div>
               </div>
               {solicitud.informe_final_url && (
                 <Link href={solicitud.informe_final_url} target="_blank">
                   <Button variant="outline" size="sm" className="font-bold gap-2">
                     <Eye className="h-4 w-4" /> Revisar Documento
                   </Button>
                 </Link>
               )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className={`border-${colorMap.states.error.border} ${colorMap.states.error.text} hover:${colorMap.states.error.background} font-bold px-6`}>Observar Informe</Button>
              <Button
                className={`${colorMap.states.success.background} hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-600/20`}
                onClick={handleAprobarInforme}
                disabled={submitting !== null}
              >
                Aprobar y Cerrar Proyecto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === PANEL DE OBSERVACIONES === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Lado izquierdo: Nueva Observación */}
        <Card className="lg:col-span-1 border-0 shadow-lg ring-1 ring-neutral-100">
          <CardHeader className="bg-neutral-900 text-white rounded-t-xl py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
              <FilePlus className="h-4 w-4 text-accent" /> Nueva Observación
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase">Campo a observar</Label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={newObs.campo}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedField = camposPrograma.find(c => c.id === selectedId);
                  setNewObs({...newObs, campo: selectedField?.label || selectedId});
                }}
              >
                <option value="">Selecciona un campo...</option>
                {camposPrograma.length > 0 ? (
                  camposPrograma.map(c => <option key={c.id} value={c.id}>{c.label}</option>)
                ) : (
                  <option value="otros">Otros / General</option>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase">Comentario Técnico</Label>
              <Textarea 
                placeholder="Explica qué debe corregir el solicitante..."
                className="min-h-[100px] border-neutral-200 dark:border-neutral-700 focus-visible:ring-primary/20 text-sm"
                value={newObs.comentario}
                onChange={(e) => setNewObs({...newObs, comentario: e.target.value})}
              />
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-light text-white font-bold h-11 shadow-md"
              onClick={addObservacion}
              disabled={!newObs.comentario.trim()}
            >
              Anexar a Lista
            </Button>

            {/* Error Message */}
            {obsError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 animate-in slide-in-from-top-2 duration-200">
                <p className="text-sm font-medium text-red-700">{obsError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lado derecho: Lista y Dictamen */}
        <Card className="lg:col-span-2 border-0 shadow-lg ring-1 ring-neutral-100">
          <CardHeader className="border-b border-neutral-100 dark:border-neutral-700 py-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" /> Lista de Nuevos Hallazgos ({newObservaciones.length})
              </CardTitle>
              {newObservaciones.length > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">ACCIONES PENDIENTES</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            {newObservaciones.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 border-2 border-dashed border-neutral-100 dark:border-neutral-700 rounded-2xl bg-neutral-50/50">
                <ShieldCheck className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No hay nuevas observaciones pendientes.</p>
                <p className="text-[10px] uppercase tracking-tighter mt-1 opacity-60">Listo para aprobación si el expediente está completo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newObservaciones.map((obs, i) => (
                  <div key={i} className={`flex items-start gap-4 p-4 rounded-xl ${colorMap.states.warning.background}/30 border ${colorMap.states.warning.border} group animate-in slide-in-from-right-2 duration-300`}>
                    <div className={`h-8 w-8 rounded-full ${colorMap.states.warning.background} flex items-center justify-center shrink-0`}>
                      <span className={`text-xs font-bold ${colorMap.states.warning.text}`}>{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-bold ${colorMap.states.warning.text} uppercase tracking-widest`}>{obs.campo}</p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-200 mt-1 leading-relaxed">{obs.comentario}</p>
                    </div>
                    <button 
                      onClick={() => removeObservacion(i)}
                      className="text-neutral-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Acciones Finales */}
            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                className={`border-primary/20 ${colorMap.primary.text} hover:bg-neutral-50 dark:hover:bg-neutral-800 gap-2 h-11 px-6 font-bold disabled:opacity-50`}
                onClick={handleObservar}
                disabled={submitting !== null || newObservaciones.length === 0}
              >
                {submitting === 'observar' ? <Loader2 className={`h-4 w-4 animate-spin ${colorMap.primary.text}`} /> : <Send className={`h-4 w-4 ${colorMap.primary.text}`} />}
                Enviar Observaciones al Solicitante
              </Button>
              <Button
                className={`${colorMap.states.success.background} hover:bg-emerald-700 text-white gap-2 shadow-lg h-11 px-8 font-bold disabled:opacity-50`}
                onClick={handleAprobar}
                disabled={submitting !== null || newObservaciones.length > 0}
              >
                {submitting === 'aprobar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                Turnar a Evaluación Técnica
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
