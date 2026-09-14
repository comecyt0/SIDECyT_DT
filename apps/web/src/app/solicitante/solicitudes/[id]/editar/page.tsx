'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { colorMap } from '@/lib/color-mapper';
import { DocumentosAdjuntos } from '@/components/solicitante/DocumentosAdjuntos';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Solicitud } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';
import { formatCurrency } from '@/lib/format';

export default function EditarSolicitudPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; description: string; onConfirm: () => void}>({
    open: false, title: '', description: '', onConfirm: () => {}
  });

  useEffect(() => {
    api.get(`/solicitudes/${id}`)
      .then(({ data }) => {
        setSolicitud(data);
      })
      .catch(() => router.push('/solicitante/solicitudes'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReenviar = () => {
    setConfirmState({
      open: true,
      title: 'Reenviar Solicitud',
      description: `¿Has realizado todas las correcciones indicadas? Una vez reenviada, será revisada nuevamente por ${INSTITUTION.name}.`,
      onConfirm: async () => {
        setSending(true);
        try {
          await api.post(`/solicitudes/${id}/reenviar`);
          setFeedback({ type: 'success', message: 'Solicitud reenviada exitosamente para re-revisión.' });
          setTimeout(() => router.push('/solicitante/solicitudes'), 1500);
        } catch (error: any) {
          setFeedback({ type: 'error', message: error.response?.data?.error || 'Error al reenviar solicitud' });
        } finally {
          setSending(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!solicitud) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
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
        <Link href={`/solicitante/solicitudes/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Corregir Solicitud</h1>
          <p className="text-neutral-600 dark:text-neutral-300">{solicitud.folio}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
          {solicitud.estado.toUpperCase()}
        </Badge>
        <span className="text-sm text-neutral-600 dark:text-neutral-300">Etapa: Correcciones Requeridas</span>
      </div>

      {/* Observaciones Card */}
      {Array.isArray(solicitud.observaciones) && solicitud.observaciones.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Hallazgos Detectados
            </CardTitle>
            <CardDescription className="text-orange-800">
              Por favor realiza las correcciones indicadas y reenvía tu solicitud
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {solicitud.observaciones.map((obs: any, idx: number) => (
              <div key={idx} className="border-l-2 border-orange-300 pl-4 py-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-orange-900">
                      {obs.campo || 'Observación General'}
                    </p>
                    <p className="text-sm text-orange-800 mt-1">{obs.comentario}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="capitalize text-xs flex-shrink-0 bg-white dark:bg-neutral-900"
                  >
                    {obs.tipo || 'documental'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Project Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del Proyecto</CardTitle>
          <CardDescription>Verifica que hayas realizado las correcciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Título</p>
            <p className="text-neutral-900 dark:text-neutral-50">{solicitud.titulo_proyecto}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Descripción</p>
            <p className="text-neutral-900 dark:text-neutral-50">{solicitud.descripcion_proyecto}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Monto Solicitado</p>
            <p className="text-neutral-900 dark:text-neutral-50">{formatCurrency(Number(solicitud.monto_solicitado))}</p>
          </div>
        </CardContent>
      </Card>

      {/* Documentos Adjuntos Section */}
      <DocumentosAdjuntos
        solicitudId={parseInt(id)}
        tipoProgramaId={solicitud?.convocatoria?.tipo_programa_id || 1}
        documentos={solicitud?.documentos || []}
        onUpload={() => {
          // Recargar solicitud para mostrar el documento subido
          window.location.reload();
        }}
        readonly={false}
      />

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900 text-base">Próximos Pasos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>✓ Revisa todas las observaciones anteriores</p>
          <p>✓ Realiza los cambios necesarios en tu solicitud</p>
          <p>✓ Sube o actualiza los documentos requeridos</p>
          <p>✓ Haz clic en &quot;Reenviar Solicitud&quot; para continuar</p>
          <p>{`✓ ${INSTITUTION.name} revisará nuevamente tu solicitud corregida`}</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href={`/solicitante/solicitudes/${id}`}>
          <Button variant="outline">
            Volver
          </Button>
        </Link>
        <Button
          onClick={handleReenviar}
          disabled={sending}
          className={`${colorMap.states.success.background} ${colorMap.states.success.text} hover:opacity-90 gap-2`}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Reenviar Solicitud
        </Button>
      </div>
    </div>
  );
}
