'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Send,
  CalendarDays,
  Building2,
  FileText,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileCheck2,
  Download,
  FileSignature,
  CreditCard,
  Landmark,
  ShieldCheck,
  Upload,
  ClipboardList,
  Route
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { DocumentosAdjuntos } from '@/components/solicitante/DocumentosAdjuntos';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import StepFrame from '@/components/ui/step-frame';
import PageHeader from '@/components/ui/page-header';
import type { Solicitud } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';

const estadoIcon: Record<string, React.ElementType> = {
  borrador: FileText,
  enviada: Send,
  en_revision: Clock,
  observada: AlertCircle,
  en_evaluacion: BookOpen,
  aprobada: CheckCircle2,
  rechazada: XCircle,
};

const ETAPA_LABEL: Record<string, string> = {
  recepcion: 'Recepción',
  revision: 'Revisión documental',
  evaluacion: 'Evaluación técnica',
  convenio: 'Convenio',
  ministracion: 'Entrega del apoyo',
  seguimiento: 'Seguimiento',
  cierre: 'Cierre',
};

const etapaLabel = (etapa?: string | null) => {
  const key = etapa || 'recepcion';
  return ETAPA_LABEL[key] ?? key.replace(/_/g, ' ');
};

const MINISTRACION_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  revision: 'En revisión',
  en_revision: 'En revisión',
  autorizada: 'Autorizada',
  programada: 'Programada',
  pagada: 'Pagada',
  rechazada: 'Con correcciones',
  rechazado: 'Con correcciones',
};

const INFORME_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  entregado: 'En revisión',
  en_revision: 'En revisión',
  observado: 'Con correcciones',
  rechazado: 'Con correcciones',
  aprobado: 'Aprobado',
};

const INFORME_TONE: Record<string, string> = {
  pendiente: 'amber',
  entregado: 'sky',
  en_revision: 'violet',
  aprobado: 'emerald',
};

const TIMELINE_STEPS = [
  { key: 'borrador',      label: 'Borrador' },
  { key: 'enviada',       label: 'Enviada' },
  { key: 'en_revision',   label: 'Revisión' },
  { key: 'en_evaluacion', label: 'Evaluación' },
  { key: 'aprobada',      label: 'Aprobada' },
];

interface TipoDocumento {
  id: number;
  nombre: string;
  clave: string;
  obligatorio: boolean;
}

export default function DetalleSolicitudPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [enviarError, setEnviarError] = useState<string | null>(null);
  const [informeFile, setInformeFile] = useState<File | null>(null);
  const [informeResultados, setInformeResultados] = useState('');
  const [submittingInforme, setSubmittingInforme] = useState(false);
  const [informeError, setInformeError] = useState<string | null>(null);
  const [informeSuccess, setInformeSuccess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; description: string; onConfirm: () => void}>({
    open: false, title: '', description: '', onConfirm: () => {}
  });
  const [showBeneficiarioForm, setShowBeneficiarioForm] = useState(false);
  const [beneficiarioForm, setBeneficiarioForm] = useState({ cuenta_clabe: '', numero_cuenta: '', titular_cuenta: '' });
  const [savingBeneficiario, setSavingBeneficiario] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get(`/solicitudes/${id}`);
        setSolicitud(data);

        // Cargar tipos de documentos del programa
        const tipoProgramaId = data.convocatoria?.tipo_programa_id;
        if (tipoProgramaId) {
          try {
            const docsRes = await api.get(`/catalogs/programa/${tipoProgramaId}/documentos`);
            const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
            setTiposDocumento(docs);
          } catch (err) {
            console.error('Error loading programa documentos:', err);
          }
        }
      } catch {
        router.push('/solicitante/solicitudes');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, router]);

  const handleDownload = async (endpoint: string, filename: string) => {
    if (!solicitud) return;
    try {
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setFeedback({ type: 'error', message: 'No pudimos descargar el documento. Inténtalo de nuevo.' });
    }
  };

  const handleEnviar = async () => {
    if (!solicitud) return;
    // Validar documentos obligatorios antes de enviar
    const documentosSubidos = solicitud.documentos?.map((d: any) => d.tipo) || [];
    const documentosFaltantes = tiposDocumento.filter(
      t => t.obligatorio && !documentosSubidos.includes(t.clave)
    );

    if (documentosFaltantes.length > 0) {
      setEnviarError(
        `Faltan documentos obligatorios: ${documentosFaltantes.map(d => d.nombre).join(', ')}`
      );
      return;
    }

    setEnviarError(null);

    setConfirmState({
      open: true,
      title: 'Enviar la solicitud',
      description: '¿Quieres enviar esta solicitud a revisión documental? Una vez enviada ya no podrás editarla.',
      onConfirm: async () => {
        setSending(true);
        try {
          await api.post(`/solicitudes/${id}/enviar`);
          setFeedback({ type: 'success', message: `Solicitud enviada exitosamente. ${INSTITUTION.name} recibirá tu expediente.` });
          router.refresh();
          setSolicitud((prev) => (prev ? { ...prev, estado: 'enviada', etapa_actual: 'revision' } : null));
        } catch (error) {
          const errorMsg = error instanceof Error
            ? (error as any).response?.data?.error || error.message
            : 'Error al enviar la solicitud';
          setEnviarError(errorMsg);
          setFeedback({ type: 'error', message: errorMsg });
        } finally {
          setSending(false);
        }
      },
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    if (!solicitud) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setFeedback({ type: 'error', message: 'Solo se permiten archivos PDF.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'El archivo no debe superar los 5MB.' });
      return;
    }

    setUploadingDoc(tipo);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);

    try {
      await api.post(`/solicitudes/${id}/documentos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Recargar solicitud para mostrar el documento subido
      const { data } = await api.get(`/solicitudes/${id}`);
      setSolicitud(data);
      setFeedback({ type: 'success', message: 'Documento subido exitosamente.' });
    } catch (error) {
      const errorMsg = error instanceof Error
        ? (error as any).response?.data?.error || error.message
        : 'Error al subir el documento';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setUploadingDoc(null);
      event.target.value = ''; // Reset input so same file can be chosen again if needed
    }
  };

  const handleUpdateBeneficiario = async () => {
    if (!solicitud) return;
    setSavingBeneficiario(true);
    try {
      const { data } = await api.put(`/solicitudes/${id}/beneficiario`, beneficiarioForm);
      setFeedback({ type: 'success', message: data.message || 'Datos bancarios guardados correctamente.' });
      setShowBeneficiarioForm(false);
      // Reload to show updated CLABE
      const { data: updated } = await api.get(`/solicitudes/${id}`);
      setSolicitud(updated);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Error al guardar los datos bancarios.' });
    } finally {
      setSavingBeneficiario(false);
    }
  };

  const handleSubmitInforme = async () => {
    if (!solicitud) return;
    setInformeError(null);
    setInformeSuccess(null);

    // Validar archivo
    if (!informeFile) {
      setInformeError('Debes adjuntar el archivo del informe.');
      return;
    }

    if (informeFile.type !== 'application/pdf') {
      setInformeError('Solo se permiten archivos PDF.');
      return;
    }

    if (informeFile.size > 10 * 1024 * 1024) {
      setInformeError('El archivo no debe superar los 10MB.');
      return;
    }

    // Validar que no haya pasado la fecha límite
    if (solicitud.fecha_limite_informe) {
      const fechaLimite = new Date(solicitud.fecha_limite_informe);
      if (new Date() > fechaLimite) {
        setInformeError('La fecha límite para entregar el informe ya pasó.');
        return;
      }
    }

    setSubmittingInforme(true);

    try {
      const formData = new FormData();
      formData.append('archivo_informe', informeFile);
      formData.append('resultados_obtenidos', informeResultados);

      await api.post(`/solicitudes/${id}/informe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setInformeSuccess('Informe entregado exitosamente.');
      setInformeFile(null);
      setInformeResultados('');

      // Recargar solicitud
      setTimeout(async () => {
        const { data } = await api.get(`/solicitudes/${id}`);
        setSolicitud(data);
      }, 1500);
    } catch (error) {
      const errorMsg = error instanceof Error
        ? (error as any).response?.data?.error || error.message
        : 'Error al entregar el informe';
      setInformeError(errorMsg);
    } finally {
      setSubmittingInforme(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--auth-vino)' }} />
      </div>
    );
  }

  if (!solicitud) return null;

  const StatusIcon = estadoIcon[solicitud.estado] || FileText;
  const informeEstado = solicitud.estado_informe || 'pendiente';
  const informeTone = INFORME_TONE[informeEstado] ?? 'red';

  // Timeline position
  const timelineOrder = TIMELINE_STEPS.map(s => s.key);
  const currentIdx = timelineOrder.indexOf(solicitud.estado);

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
        backHref="/solicitante/solicitudes"
        backLabel="Volver a mis solicitudes"
        eyebrow={solicitud.folio}
        title={solicitud.titulo_proyecto}
        description={`Aquí ves el avance de tu solicitud, sus documentos y lo que ${INSTITUTION.name} te pide en cada etapa.`}
        actions={solicitud.estado === 'borrador' ? (
          <Button
            onClick={handleEnviar}
            disabled={sending || enviarError !== null}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar a revisión
          </Button>
        ) : undefined}
      />

      <div className="app-card rounded-[22px] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4">
        <span className="app-tile-icon shrink-0" style={{ color: 'var(--auth-vino)' }}>
          <StatusIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--app-ink)]">Estado actual</p>
            <span className={estadoBadgeClass(solicitud.estado)}>
              {estadoLabel(solicitud.estado)}
            </span>
          </div>
          <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Etapa: {etapaLabel(solicitud.etapa_actual)}</p>
        </div>
      </div>

      {enviarError && (
        <AlertBox
          type="error"
          title="Todavía no se puede enviar"
          message={enviarError}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <Route className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Avance de tu solicitud
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-4 right-4 h-1 bg-[var(--app-rule)] rounded-full z-0" />
            <div
              className="absolute top-4 left-4 h-1 rounded-full z-0 transition-[width] duration-700"
              style={{ backgroundColor: 'var(--auth-vino)', width: currentIdx < 0 ? '0%' : `${(currentIdx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            />

            {TIMELINE_STEPS.map((step, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-1">
                  <div
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                      done ? 'text-white' : active ? 'bg-[var(--app-card-bg)] ring-4 ring-[var(--auth-vino-soft)]' : 'bg-[var(--app-card-bg)] border-[var(--app-rule)] text-[var(--app-ink-2)]'
                    }`}
                    style={done ? { backgroundColor: 'var(--auth-vino)', borderColor: 'var(--auth-vino)' } : active ? { borderColor: 'var(--auth-vino)', color: 'var(--auth-vino)' } : undefined}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" aria-label="Completado" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden md:block ${active || done ? 'text-[var(--app-ink)]' : 'text-[var(--app-ink-2)]'}`} style={active ? { color: 'var(--auth-vino)' } : undefined}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Datos generales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--app-rule)] pb-2">
              <span className="text-[var(--app-ink-2)] font-medium">Modalidad</span>
              <span className="font-semibold text-[var(--app-ink)] text-right">{solicitud.modalidad || '—'}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--app-rule)] pb-2">
              <span className="text-[var(--app-ink-2)] font-medium">Convocatoria</span>
              <span className="font-semibold text-[var(--app-ink)] text-right">{solicitud.convocatoria?.nombre || '—'}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--app-rule)] pb-2">
              <span className="text-[var(--app-ink-2)] font-medium">Ejercicio fiscal</span>
              <span className="font-semibold text-[var(--app-ink)] text-right">{solicitud.convocatoria?.ejercicio_fiscal || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--app-ink-2)] font-medium">Área de conocimiento</span>
              <span className="font-semibold text-[var(--app-ink)] text-right">{solicitud.area_conocimiento?.nombre || '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Building2 className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Institución
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--app-rule)] pb-2">
              <span className="text-[var(--app-ink-2)] font-medium">Institución</span>
              <span className="font-semibold text-[var(--app-ink)] text-right">{solicitud.empresa?.nombre || '—'}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--app-rule)] pb-2">
              <span className="text-[var(--app-ink-2)] font-medium">Fecha de registro</span>
              <span className="font-medium text-[var(--app-ink)] flex items-center gap-1 text-right">
                <CalendarDays className="h-3 w-3" />
                {solicitud.created_at ? new Date(solicitud.created_at).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--app-ink-2)] font-medium">Última actualización</span>
              <span className="font-medium text-[var(--app-ink)] text-right">
                {solicitud.updated_at ? new Date(solicitud.updated_at).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {(solicitud.estado === 'aprobada' || solicitud.estado === 'rechazada' || solicitud.asignaciones?.some((a: any) => a.dictamen)) && (
        <Card>
          <CardHeader>
            <CardTitle>
              <FileCheck2 className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Documentos oficiales
            </CardTitle>
            <CardDescription>Descarga los documentos que {INSTITUTION.name} emitió para tu solicitud.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {solicitud.asignaciones?.map((asig: any, i: number) => asig.dictamen && (
                <div key={i} className="flex items-center justify-between gap-3 p-4 rounded-[16px] border border-[var(--app-rule)] bg-[var(--auth-field)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="app-tile-icon shrink-0" style={{ color: 'var(--tile-vino-fg)' }}>
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--app-ink)]">Dictamen técnico</p>
                      <p className="text-xs text-[var(--app-ink-2)]">Resultado de la evaluación</p>
                    </div>
                  </div>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => handleDownload(`/documentos/dictamen/${asig.dictamen.id}`, `Dictamen_${solicitud.folio}.pdf`)}
                  >
                    <Download className="h-4 w-4" /> Descargar
                  </Button>
                </div>
              ))}

              {solicitud.estado === 'aprobada' && (
                <div className="flex items-center justify-between gap-3 p-4 rounded-[16px] border border-[var(--app-rule)] bg-[var(--auth-field)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="app-tile-icon shrink-0" style={{ color: 'var(--tile-sky-fg)' }}>
                      <FileSignature className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--app-ink)]">Convenio de asignación</p>
                      <p className="text-xs text-[var(--app-ink-2)]">Para firma de tu institución</p>
                    </div>
                  </div>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => handleDownload(`/documentos/convenio/${solicitud.id}`, `Convenio_${solicitud.folio}.pdf`)}
                  >
                    <Download className="h-4 w-4" /> Descargar
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {solicitud.estado === 'observada' && solicitud.observaciones && solicitud.observaciones.length > 0 && (
        <Card style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
          <CardHeader>
            <CardTitle>
              <AlertCircle className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Correcciones que pide {INSTITUTION.name}
            </CardTitle>
            <CardDescription>Haz los cambios indicados para que tu solicitud pueda continuar.</CardDescription>
            <CardAction>
              <Link href={`/solicitante/solicitudes/${id}/editar`}>
                <Button size="sm">
                  <FileText className="h-4 w-4" /> Corregir ahora
                </Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {solicitud.observaciones.map((obs: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 rounded-[16px] bg-[var(--app-card-bg)] border border-[var(--app-rule)]">
                <div className="h-8 w-8 rounded-[10px] flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: 'var(--tile-gold-bg)', color: 'var(--tile-gold-fg)' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[var(--app-ink-2)] uppercase tracking-wider leading-none mb-1">{obs.campo ? String(obs.campo).replace(/_/g, ' ') : 'General'}</p>
                  <p className="text-sm text-[var(--app-ink)] font-medium leading-relaxed">{obs.comentario}</p>
                  <p className="text-xs text-[var(--app-ink-2)] mt-2">Fecha: {new Date(obs.created_at).toLocaleDateString('es-MX')}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documentos Adjuntos Section */}
      {(solicitud.estado === 'borrador' || solicitud.estado === 'observada') && (
        <div className="animate-in fade-in duration-500">
          <DocumentosAdjuntos
            solicitudId={solicitud.id}
            tipoProgramaId={solicitud.convocatoria?.tipo_programa_id || 1}
            documentos={solicitud.documentos || []}
            onUpload={() => {
              // Recargar solicitud para mostrar el documento subido
              window.location.reload();
            }}
            readonly={false}
          />
        </div>
      )}

      {['aprobada', 'convenio', 'ministracion'].includes(solicitud.estado) && (
        <Card>
          <CardHeader>
            <CardTitle>
              <CreditCard className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Entrega del apoyo (ministración)
            </CardTitle>
            <CardDescription>Sigue el avance del pago y sube los documentos bancarios que hacen falta.</CardDescription>
            <CardAction>
              <span className="pill" data-tone="teal">
                {MINISTRACION_LABEL[solicitud.ministracion?.estado ?? 'pendiente'] ?? 'Pendiente'}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-8">
            {(() => {
              const miniEstado = solicitud.ministracion?.estado ?? 'pendiente';
              const progressMap: Record<string, string> = {
                pendiente: '10%',
                revision: '50%',
                autorizada: '75%',
                pagada: '100%',
                rechazada: '10%',
              };
              const stepActive: Record<string, number> = {
                pendiente: 0, revision: 1, autorizada: 2, pagada: 3, rechazada: 0,
              };
              const activeStep = stepActive[miniEstado] ?? 0;
              return (
                <div className="relative">
                  <div className="h-2 bg-[var(--app-rule)] rounded-full w-full mb-8 relative">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-[width] duration-1000"
                      style={{ backgroundColor: 'var(--auth-vino)', width: progressMap[miniEstado] ?? '10%' }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-[var(--app-ink-2)]">
                    {['Formalización', 'Validación', 'Autorización', 'Pagada'].map((label, i) => (
                      <div key={label} style={i <= activeStep ? { color: 'var(--auth-vino)' } : undefined}>{label}</div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[var(--app-ink)] flex items-center gap-2">
                  <Landmark className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Cuenta para el depósito
                </h4>
                <div className="p-5 rounded-[16px] bg-[var(--auth-field)] border border-[var(--app-rule)] flex flex-col gap-3">
                  <div className="flex justify-between items-center gap-4 text-sm">
                    <span className="text-[var(--app-ink-2)]">Banco</span>
                    <span className="font-bold text-[var(--app-ink)] text-right">{solicitud.ministracion?.banco?.nombre || 'Pendiente de asignar'}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4 text-sm">
                    <span className="text-[var(--app-ink-2)]">CLABE</span>
                    <span className="font-mono font-bold text-[var(--app-ink)] text-right">{solicitud.ministracion?.cuenta_clabe || '•••• •••• •••• ••••'}</span>
                  </div>
                  {solicitud.ministracion?.numero_cuenta && (
                    <div className="flex justify-between items-center gap-4 text-sm">
                      <span className="text-[var(--app-ink-2)]">Número de cuenta</span>
                      <span className="font-mono font-bold text-[var(--app-ink)] text-right">{solicitud.ministracion.numero_cuenta}</span>
                    </div>
                  )}
                  {solicitud.ministracion?.titular_cuenta && (
                    <div className="flex justify-between items-center gap-4 text-sm">
                      <span className="text-[var(--app-ink-2)]">Titular</span>
                      <span className="font-bold text-[var(--app-ink)] text-right">{solicitud.ministracion.titular_cuenta}</span>
                    </div>
                  )}

                  <Button
                    variant="soft"
                    onClick={() => {
                      setBeneficiarioForm({
                        cuenta_clabe: solicitud.ministracion?.cuenta_clabe || '',
                        numero_cuenta: solicitud.ministracion?.numero_cuenta || '',
                        titular_cuenta: solicitud.ministracion?.titular_cuenta || '',
                      });
                      setShowBeneficiarioForm(true);
                    }}
                    className="w-full mt-2"
                  >
                    <ShieldCheck className="h-4 w-4" /> {solicitud.ministracion?.cuenta_clabe ? 'Cambiar datos bancarios' : 'Registrar datos bancarios'}
                  </Button>

                  <StepFrame
                    open={showBeneficiarioForm}
                    size="md"
                    title="Datos bancarios para el pago"
                    icon={<ShieldCheck className="h-5 w-5" />}
                    intro={<>Aquí se depositará el apoyo. La cuenta debe estar <strong>a nombre de la institución</strong> que presenta el proyecto; revisa cada dígito antes de guardar.</>}
                    onClose={() => setShowBeneficiarioForm(false)}
                    onSubmit={handleUpdateBeneficiario}
                    submitting={savingBeneficiario}
                    submitLabel="Guardar datos"
                    steps={[
                      {
                        key: 'clabe',
                        label: 'La cuenta',
                        question: '¿A qué cuenta se deposita?',
                        validate: () => {
                          if (!/^\d{18}$/.test(beneficiarioForm.cuenta_clabe)) return 'La CLABE son exactamente 18 dígitos, sin espacios.';
                          return null;
                        },
                        content: (
                          <>
                            <div className="space-y-1.5">
                              <label htmlFor="ben-clabe" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">CLABE interbancaria (18 dígitos) *</label>
                              <input
                                id="ben-clabe"
                                type="text"
                                inputMode="numeric"
                                maxLength={18}
                                placeholder="000000000000000000"
                                value={beneficiarioForm.cuenta_clabe}
                                onChange={e => setBeneficiarioForm(f => ({ ...f, cuenta_clabe: e.target.value.replace(/\D/g, '') }))}
                                className="auth-input auth-input-static pl-4 font-mono tracking-widest"
                              />
                              <p className="text-xs text-[var(--app-ink-2)]">Aparece en el estado de cuenta o en la app del banco.</p>
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="ben-cuenta" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Número de cuenta (opcional)</label>
                              <input
                                id="ben-cuenta"
                                type="text"
                                maxLength={50}
                                placeholder="Número de cuenta bancaria"
                                value={beneficiarioForm.numero_cuenta}
                                onChange={e => setBeneficiarioForm(f => ({ ...f, numero_cuenta: e.target.value }))}
                                className="auth-input auth-input-static pl-4"
                              />
                            </div>
                          </>
                        ),
                      },
                      {
                        key: 'titular',
                        label: 'El titular',
                        question: '¿A nombre de quién está?',
                        validate: () => (!beneficiarioForm.titular_cuenta.trim() ? 'Escribe el nombre del titular tal como aparece en el banco.' : null),
                        content: (
                          <div className="space-y-1.5">
                            <label htmlFor="ben-titular" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Titular de la cuenta *</label>
                            <input
                              id="ben-titular"
                              type="text"
                              maxLength={255}
                              placeholder="Nombre o razón social"
                              value={beneficiarioForm.titular_cuenta}
                              onChange={e => setBeneficiarioForm(f => ({ ...f, titular_cuenta: e.target.value }))}
                              className="auth-input auth-input-static pl-4"
                            />
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[var(--app-ink)] flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Documentos para el pago
                </h4>
                <div className="space-y-3">
                  {[
                    { key: 'carta_compromiso', name: 'Carta compromiso firmada', status: solicitud.ministracion?.carta_compromiso_url ? 'checked' : 'pending' },
                    { key: 'caratula_banco', name: 'Carátula del estado de cuenta', status: solicitud.ministracion?.caratula_banco_url ? 'checked' : 'pending' },
                    { key: 'constancia_fiscal', name: 'Constancia de situación fiscal', status: solicitud.ministracion?.constancia_fiscal_url ? 'checked' : 'pending' },
                    { key: 'factura_institucion', name: 'Factura de la institución', status: solicitud.ministracion?.factura_institucion_url ? 'checked' : 'pending' }
                  ].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 px-4 rounded-[14px] border border-[var(--app-rule)] bg-[var(--auth-field)]">
                      <span className="text-sm font-medium text-[var(--app-ink)]">{doc.name}</span>
                      {doc.status === 'checked' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--tile-emerald-fg)' }}>
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Listo
                        </span>
                      ) : (
                        <label className={`btn-liquid icon-glass h-8 px-3 text-sm font-semibold rounded-[10px] cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors ${uploadingDoc === doc.key ? 'opacity-50 pointer-events-none' : ''}`} style={{ color: 'var(--auth-vino)' }}>
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, doc.key)}
                            disabled={uploadingDoc === doc.key}
                          />
                          {uploadingDoc === doc.key ? <Loader2 className="animate-spin h-4 w-4" /> : <><Upload className="h-3.5 w-3.5" aria-hidden="true" /> Subir</>}
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(solicitud.estado === 'aprobada' || solicitud.estado === 'ministracion' || solicitud.fecha_limite_informe) && (
        <Card>
          <CardHeader>
            <CardTitle>
              <ClipboardList className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Informe final
            </CardTitle>
            <CardDescription>
              {solicitud.estado_informe === 'pendiente'
                ? 'Entrega el informe final de tu proyecto antes de la fecha límite.'
                : `Tu informe está en manos de ${INSTITUTION.name}.`}
            </CardDescription>
            <CardAction>
              <span className="pill" data-tone={informeTone}>
                {INFORME_LABEL[informeEstado] ?? 'Pendiente'}
              </span>
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-[16px] bg-[var(--auth-field)] border border-[var(--app-rule)]">
              <span className="app-tile-icon shrink-0" style={{ color: 'var(--tile-sky-fg)' }}>
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)]">Fecha límite de entrega</p>
                <p className="text-sm font-bold text-[var(--app-ink)] mt-0.5">
                  {solicitud.fecha_limite_informe ? new Date(solicitud.fecha_limite_informe).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Sin fecha definida'}
                </p>
              </div>
              {solicitud.fecha_entrega_informe && (
                <div className="sm:ml-auto">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)]">Entregado</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--tile-emerald-fg)' }}>
                    {new Date(solicitud.fecha_entrega_informe).toLocaleDateString('es-MX')}
                  </p>
                </div>
              )}
            </div>

            {informeError && <AlertBox type="error" message={informeError} />}
            {informeSuccess && <AlertBox type="success" message={informeSuccess} />}

            {solicitud.estado_informe === 'pendiente' && !informeSuccess && (
              <div className="space-y-6 border-t border-[var(--app-rule)] pt-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--app-ink)] mb-3">
                    Archivo del informe *
                  </label>
                  <label className="flex items-center justify-center w-full p-8 border-2 border-dashed border-[var(--app-rule)] rounded-[16px] hover:border-[var(--auth-vino)] transition-colors cursor-pointer bg-[var(--auth-field)]">
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--auth-vino)' }} />
                      <p className="text-sm font-medium text-[var(--app-ink)]">
                        {informeFile?.name || 'Elige o arrastra aquí tu archivo PDF'}
                      </p>
                      <p className="text-xs text-[var(--app-ink-2)] mt-1">Máximo 10 MB</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setInformeFile(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label htmlFor="informe-resultados" className="block text-sm font-semibold text-[var(--app-ink)] mb-3">
                    Resultados obtenidos
                  </label>
                  <textarea
                    id="informe-resultados"
                    value={informeResultados}
                    onChange={(e) => setInformeResultados(e.target.value)}
                    placeholder="Cuenta en pocas líneas qué resultados alcanzó tu proyecto."
                    className="w-full px-4 py-3 border border-[var(--app-rule)] bg-[var(--auth-field)] text-[var(--app-ink)] rounded-[14px] text-sm resize-none h-24 outline-none focus:border-[var(--auth-vino)] focus:ring-4 focus:ring-[var(--auth-vino-soft)]"
                    maxLength={2000}
                  />
                  <p className="text-xs text-[var(--app-ink-2)] mt-1">
                    {informeResultados.length}/2000 caracteres
                  </p>
                </div>

                <Button
                  onClick={handleSubmitInforme}
                  disabled={submittingInforme || !informeFile}
                  size="lg"
                  className="w-full"
                >
                  {submittingInforme ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando informe...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="h-4 w-4" />
                      Enviar informe final
                    </>
                  )}
                </Button>
              </div>
            )}

            {solicitud.estado_informe !== 'pendiente' && (
              <div className="space-y-4 border-t border-[var(--app-rule)] pt-6">
                {solicitud.estado_informe === 'observado' && (
                  <AlertBox
                    type="warning"
                    title="Lo que hay que corregir"
                    message={solicitud.observaciones_informe || 'Tu informe tiene observaciones. Revisa los comentarios del equipo de revisión.'}
                  />
                )}

                {solicitud.estado_informe === 'aprobado' && (
                  <AlertBox
                    type="success"
                    title="Informe aprobado"
                    message="Tu informe fue aprobado. No tienes que hacer nada más."
                  />
                )}

                {solicitud.informe_final_url && (
                  <Button
                    onClick={() => handleDownload(solicitud.informe_final_url!, `informe_${solicitud.folio}.pdf`)}
                    variant="soft"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                    Descargar el informe que enviaste
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {solicitud.resumen && (
        <Card>
          <CardHeader>
            <CardTitle>
              <BookOpen className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Resumen del proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--app-ink)] leading-relaxed whitespace-pre-wrap">{solicitud.resumen}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
