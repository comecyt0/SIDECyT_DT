'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { colorMap, getStateColorClasses } from '@/lib/color-mapper';
import {
  ArrowLeft,
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
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { DocumentosAdjuntos } from '@/components/solicitante/DocumentosAdjuntos';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Solicitud } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';
import { estadoLabel } from '@/lib/solicitud-estados';

const estadoConfig: Record<string, { label: string; colorClasses: string; icon: React.ElementType }> = {
  borrador:      { label: 'Borrador',       colorClasses: `${getStateColorClasses('borrador').bg} ${getStateColorClasses('borrador').text} border-neutral-200 dark:border-neutral-700`,     icon: FileText },
  enviada:       { label: 'Enviada',        colorClasses: `${getStateColorClasses('enviada').bg} ${getStateColorClasses('enviada').text} ${colorMap.states.info.border}`,     icon: Send },
  en_revision:   { label: 'En Revisión',    colorClasses: `${getStateColorClasses('en_revision').bg} ${getStateColorClasses('en_revision').text} ${colorMap.states.warning.border}`,  icon: Clock },
  observada:     { label: 'Observada',      colorClasses: `${getStateColorClasses('observada').bg} ${getStateColorClasses('observada').text} ${colorMap.states.warning.border}`, icon: AlertCircle },
  en_evaluacion: { label: 'En Evaluación', colorClasses: `${getStateColorClasses('en_evaluacion').bg} ${getStateColorClasses('en_evaluacion').text} ${colorMap.states.info.border}`, icon: BookOpen },
  aprobada:      { label: 'Aprobada',       colorClasses: `${getStateColorClasses('aprobada').bg} ${getStateColorClasses('aprobada').text} ${colorMap.states.success.border}`,  icon: CheckCircle2 },
  rechazada:     { label: 'Rechazada',      colorClasses: `${getStateColorClasses('rechazada').bg} ${getStateColorClasses('rechazada').text} ${colorMap.states.error.border}`,        icon: XCircle },
};

const TIMELINE_STEPS = [
  { key: 'borrador',      label: 'Borrador' },
  { key: 'enviada',       label: 'Enviada' },
  { key: 'en_revision',   label: 'En Revisión' },
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
      setFeedback({ type: 'error', message: 'Error al descargar el documento.' });
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
      title: 'Enviar Solicitud',
      description: '¿Deseas enviar esta solicitud para revisión documental? Una vez enviada no podrás editarla.',
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
      <div className="flex justify-center items-center h-64 text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!solicitud) return null;

  const cfg = estadoConfig[solicitud.estado] || { label: estadoLabel(solicitud.estado), colorClasses: `${colorMap.neutral.lighter} text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700`, icon: FileText };
  const StatusIcon = cfg.icon;

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
      {/* Breadcrumb header */}
      <div className="flex items-center gap-4">
        <Link href="/solicitante/solicitudes">
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-neutral-200 dark:border-neutral-700">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">{solicitud.folio}</p>
          <h1 className="text-2xl font-bold text-neutral-dark leading-tight">{solicitud.titulo_proyecto}</h1>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${cfg.colorClasses}`}>
        <StatusIcon className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-sm">Estado actual: {cfg.label}</p>
          <p className="text-xs opacity-70">Etapa: {solicitud.etapa_actual || 'recepcion'}</p>
        </div>
        {solicitud.estado === 'borrador' && (
          <div className="ml-auto">
            <Button
              onClick={handleEnviar}
              disabled={sending || enviarError !== null}
              className="h-9 gap-2 shadow"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar a Revisión
            </Button>
          </div>
        )}
      </div>

      {/* Document Validation Error */}
      {enviarError && (
        <AlertBox
          type="error"
          title="No se puede enviar la solicitud"
          message={enviarError}
        />
      )}


      {/* Timeline */}
      <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
        <CardHeader className="pb-3 bg-neutral-50/50 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-base">Progreso del Expediente</CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex items-center justify-between relative">
            {/* Track line */}
            <div className="absolute top-4 left-4 right-4 h-1 bg-neutral-200 rounded-full z-0" />
            <div
              className="absolute top-4 left-4 h-1 bg-primary rounded-full z-0 transition-all duration-700"
              style={{ width: currentIdx < 0 ? '0%' : `${(currentIdx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            />

            {TIMELINE_STEPS.map((step, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-1">
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                    done ? 'bg-primary border-primary text-white' :
                    active ? 'bg-white dark:bg-neutral-900 border-primary text-primary ring-4 ring-primary/20' :
                    'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 text-neutral-400 dark:text-neutral-500'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden md:block ${active ? 'text-primary' : done ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
          <CardHeader className="pb-3 bg-neutral-50/50 border-b border-neutral-100 dark:border-neutral-700">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Datos Generales
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Modalidad</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{solicitud.modalidad || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Convocatoria</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-right max-w-[180px]">{solicitud.convocatoria?.nombre || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Ejercicio Fiscal</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{solicitud.convocatoria?.ejercicio_fiscal || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Área Conocimiento</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{solicitud.area_conocimiento?.nombre || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
          <CardHeader className="pb-3 bg-neutral-50/50 border-b border-neutral-100 dark:border-neutral-700">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Institución
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Institución</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{solicitud.empresa?.nombre || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Fecha Registro</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-100 flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {solicitud.created_at ? new Date(solicitud.created_at).toLocaleDateString('es-MX', { dateStyle: 'long' }) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Última Actualización</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-100">
                {solicitud.updated_at ? new Date(solicitud.updated_at).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Official Documents Section */}
      {(solicitud.estado === 'aprobada' || solicitud.estado === 'rechazada' || solicitud.asignaciones?.some((a: any) => a.dictamen)) && (
        <Card className="border-0 shadow-sm ring-1 ring-neutral-100 overflow-hidden">
          <CardHeader className="pb-3 bg-neutral-900 text-white border-b border-neutral-800">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-accent" /> Documentos Oficiales
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dictamen Download */}
              {solicitud.asignaciones?.map((asig: any, i: number) => asig.dictamen && (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Dictamen Técnico</p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-tighter">Formato Oficial B</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-primary hover:bg-primary/5"
                    onClick={() => handleDownload(`/documentos/dictamen/${asig.dictamen.id}`, `Dictamen_${solicitud.folio}.pdf`)}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              ))}

              {/* Convenio Download */}
              {solicitud.estado === 'aprobada' && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileSignature className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Convenio de Asignación</p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-tighter">Firma y Formalización</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-primary hover:bg-primary/5"
                    onClick={() => handleDownload(`/documentos/convenio/${solicitud.id}`, `Convenio_${solicitud.folio}.pdf`)}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations Section */}
      {solicitud.estado === 'observada' && solicitud.observaciones && solicitud.observaciones.length > 0 && (
        <Card className="border-0 shadow-lg ring-2 ring-orange-400/30 overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-orange-50 border-b border-orange-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" /> Correcciones Requeridas por {INSTITUTION.name}
              </CardTitle>
              <Link href={`/solicitante/solicitudes/${id}/editar`}>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2">
                  <FileText className="h-4 w-4" /> Corregir ahora
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">Se han detectado los siguientes hallazgos en tu expediente. Por favor realiza los cambios indicados para continuar con el proceso:</p>
            <div className="space-y-3">
              {solicitud.observaciones.map((obs: any, i: number) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 group">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-orange-700">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest leading-none mb-1">{obs.campo || 'General'}</p>
                    <p className="text-sm text-neutral-800 dark:text-neutral-100 font-medium leading-relaxed">{obs.comentario}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2 italic">Fecha: {new Date(obs.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Ministración (Payment) Section */}
      {['aprobada', 'convenio', 'ministracion'].includes(solicitud.estado) && (
        <Card className="border-0 shadow-lg ring-1 ring-primary/20 overflow-hidden animate-in zoom-in-95 duration-500">
          <CardHeader className="bg-primary text-white pb-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-accent" /> Proceso de Ministración (Pago)
                </CardTitle>
                <p className="text-white/70 text-sm mt-1">Sigue el avance de tu pago y carga la documentación bancaria.</p>
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 px-4 py-1">
                {solicitud.ministracion?.estado?.toUpperCase() || 'PENDIENTE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            {/* Payment Progress Bar */}
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
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full w-full mb-8 relative">
                    <div
                      className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all duration-1000"
                      style={{ width: progressMap[miniEstado] ?? '10%' }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] uppercase font-bold tracking-widest text-neutral-400 dark:text-neutral-500">
                    {['Formalización', 'Validación', 'Autorización', 'Pagada'].map((label, i) => (
                      <div key={label} className={i <= activeStep ? 'text-primary' : ''}>{label}</div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Bank Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" /> Datos Bancarios para Depósito
                </h4>
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">Banco</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-50">{solicitud.ministracion?.banco?.nombre || 'Pendiente de asignar'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">Cuenta CLABE</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-neutral-50">{solicitud.ministracion?.cuenta_clabe || '•••• •••• •••• ••••'}</span>
                  </div>
                  {solicitud.ministracion?.numero_cuenta && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">N° Cuenta</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-50">{solicitud.ministracion.numero_cuenta}</span>
                    </div>
                  )}
                  {solicitud.ministracion?.titular_cuenta && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">Titular</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-50">{solicitud.ministracion.titular_cuenta}</span>
                    </div>
                  )}

                  {!showBeneficiarioForm ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBeneficiarioForm({
                          cuenta_clabe: solicitud.ministracion?.cuenta_clabe || '',
                          numero_cuenta: solicitud.ministracion?.numero_cuenta || '',
                          titular_cuenta: solicitud.ministracion?.titular_cuenta || '',
                        });
                        setShowBeneficiarioForm(true);
                      }}
                      className="w-full mt-2 border-primary/30 text-primary bg-white dark:bg-neutral-900 hover:bg-primary/5 shadow-sm rounded-xl py-5 h-auto font-bold text-xs gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" /> Actualizar Datos del Beneficiario
                    </Button>
                  ) : (
                    <div className="mt-3 space-y-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-widest mb-1">Datos del Beneficiario</p>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Cuenta CLABE (18 dígitos)</label>
                        <input
                          type="text"
                          maxLength={18}
                          placeholder="000000000000000000"
                          value={beneficiarioForm.cuenta_clabe}
                          onChange={e => setBeneficiarioForm(f => ({ ...f, cuenta_clabe: e.target.value }))}
                          className="mt-1 w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">N° Cuenta</label>
                        <input
                          type="text"
                          maxLength={50}
                          placeholder="Número de cuenta bancaria"
                          value={beneficiarioForm.numero_cuenta}
                          onChange={e => setBeneficiarioForm(f => ({ ...f, numero_cuenta: e.target.value }))}
                          className="mt-1 w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Titular de la Cuenta</label>
                        <input
                          type="text"
                          maxLength={255}
                          placeholder="Nombre del titular"
                          value={beneficiarioForm.titular_cuenta}
                          onChange={e => setBeneficiarioForm(f => ({ ...f, titular_cuenta: e.target.value }))}
                          className="mt-1 w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={handleUpdateBeneficiario}
                          disabled={savingBeneficiario}
                          className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg py-2 h-auto text-xs font-bold gap-2"
                        >
                          {savingBeneficiario ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          Guardar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowBeneficiarioForm(false)}
                          disabled={savingBeneficiario}
                          className="flex-1 rounded-lg py-2 h-auto text-xs font-bold"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Required Documents for Payment */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Documentación Pendiente
                </h4>
                <div className="space-y-3">
                  {[
                    { key: 'carta_compromiso', name: 'Carta Compromiso Firmada', status: solicitud.ministracion?.carta_compromiso_url ? 'checked' : 'pending' },
                    { key: 'caratula_banco', name: 'Carátula de Estado de Cuenta', status: solicitud.ministracion?.caratula_banco_url ? 'checked' : 'pending' },
                    { key: 'constancia_fiscal', name: 'Constancia de Situación Fiscal', status: solicitud.ministracion?.constancia_fiscal_url ? 'checked' : 'pending' },
                    { key: 'factura_institucion', name: 'Factura de la Institución', status: solicitud.ministracion?.factura_institucion_url ? 'checked' : 'pending' }
                  ].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 px-4 rounded-xl border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-accent/30 transition-colors group">
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900">{doc.name}</span>
                      {doc.status === 'checked' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <label className={`h-7 px-3 text-xs font-bold text-accent hover:bg-accent/10 rounded-lg cursor-pointer flex items-center justify-center transition-colors ${uploadingDoc === doc.key ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input 
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, doc.key)} 
                            disabled={uploadingDoc === doc.key} 
                          />
                          {uploadingDoc === doc.key ? <Loader2 className="animate-spin h-4 w-4" /> : 'Subir'}
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

      {/* Informe Final Section */}
      {(solicitud.estado === 'aprobada' || solicitud.estado === 'ministracion' || solicitud.fecha_limite_informe) && (
        <Card className={`border-0 shadow-lg overflow-hidden animate-in zoom-in-95 duration-500 ${
          solicitud.estado_informe === 'pendiente'
            ? 'ring-2 ring-amber-400/30'
            : 'ring-1 ring-primary/20'
        }`}>
          <CardHeader className={`pb-6 pt-8 ${
            solicitud.estado_informe === 'pendiente'
              ? 'bg-amber-50 border-b border-amber-100'
              : 'bg-primary/5 border-b border-primary/10'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-3">
                  <ClipboardList className="h-6 w-6 text-primary" /> Informe Final
                </CardTitle>
                <p className={`text-sm mt-1 ${
                  solicitud.estado_informe === 'pendiente'
                    ? 'text-amber-700'
                    : 'text-neutral-600 dark:text-neutral-300'
                }`}>
                  {solicitud.estado_informe === 'pendiente'
                    ? 'Entrega el informe final de tu proyecto'
                    : `Tu informe está siendo revisado por ${INSTITUTION.name}`}
                </p>
              </div>
              <Badge className={`px-4 py-1 ${
                solicitud.estado_informe === 'pendiente'
                  ? 'bg-amber-100 text-amber-900'
                  : solicitud.estado_informe === 'entregado'
                  ? 'bg-blue-100 text-blue-900'
                  : solicitud.estado_informe === 'aprobado'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-red-100 text-red-900'
              }`}>
                {solicitud.estado_informe?.toUpperCase() || 'PENDIENTE'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-8 space-y-6">
            {/* Fecha Límite */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 uppercase">Fecha Límite de Entrega</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 mt-0.5">
                  {solicitud.fecha_limite_informe ? new Date(solicitud.fecha_limite_informe).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
              {solicitud.fecha_entrega_informe && (
                <div className="ml-auto">
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 uppercase">Entregado</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                    {new Date(solicitud.fecha_entrega_informe).toLocaleDateString('es-MX')}
                  </p>
                </div>
              )}
            </div>

            {/* Error/Success Alerts */}
            {informeError && <AlertBox type="error" message={informeError} />}
            {informeSuccess && <AlertBox type="success" message={informeSuccess} />}

            {/* Upload Form (only if pendiente) */}
            {solicitud.estado_informe === 'pendiente' && !informeSuccess && (
              <div className="space-y-6 border-t pt-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
                    Archivo del Informe *
                  </label>
                  <label className="flex items-center justify-center w-full p-8 border-2 border-dashed border-primary/30 rounded-xl hover:border-primary/50 transition-colors cursor-pointer bg-primary/5">
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {informeFile?.name || 'Selecciona o arrastra tu archivo PDF'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Máximo 10MB</p>
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

                {/* Resultados Obtenidos */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
                    Resultados Obtenidos
                  </label>
                  <textarea
                    value={informeResultados}
                    onChange={(e) => setInformeResultados(e.target.value)}
                    placeholder="Describe brevemente los resultados alcanzados en tu proyecto..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={2000}
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {informeResultados.length}/2000 caracteres
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitInforme}
                  disabled={submittingInforme || !informeFile}
                  className={`w-full ${colorMap.primary.background} text-white hover:opacity-90 py-6 font-bold text-base`}
                >
                  {submittingInforme ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando informe...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="h-4 w-4 mr-2" />
                      Enviar Informe Final
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Summary (if not pendiente) */}
            {solicitud.estado_informe !== 'pendiente' && (
              <div className="space-y-4 border-t pt-6">
                {solicitud.estado_informe === 'observado' && (
                  <AlertBox
                    type="warning"
                    title="Observaciones"
                    message={solicitud.observaciones_informe || 'Tu informe tiene observaciones. Por favor, revisa los comentarios del revisor.'}
                  />
                )}

                {solicitud.estado_informe === 'aprobado' && (
                  <AlertBox
                    type="success"
                    title="Informe Aprobado"
                    message="¡Felicidades! Tu informe ha sido aprobado exitosamente."
                  />
                )}

                {solicitud.informe_final_url && (
                  <Button
                    onClick={() => handleDownload(solicitud.informe_final_url!, `informe_${solicitud.folio}.pdf`)}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Informe Enviado
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {solicitud.resumen && (
        <Card className="border-0 shadow-sm ring-1 ring-neutral-100 border-l-4 border-l-primary overflow-hidden">
          <CardHeader className="pb-3 bg-neutral-50/30 border-b border-neutral-100 dark:border-neutral-700">
            <CardTitle className="text-base flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" /> Resumen Ejecutivo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">{solicitud.resumen}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
