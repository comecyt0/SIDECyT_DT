'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, AlertCircle, CheckCircle2, FileText, ListChecks } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { DocumentosAdjuntos } from '@/components/solicitante/DocumentosAdjuntos';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Solicitud } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';
import { formatCurrency } from '@/lib/format';
import PageHeader from '@/components/ui/page-header';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';

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
      title: 'Reenviar la solicitud',
      description: `¿Ya hiciste todas las correcciones que te pidieron? Al reenviarla, ${INSTITUTION.name} la revisará de nuevo.`,
      onConfirm: async () => {
        setSending(true);
        try {
          await api.post(`/solicitudes/${id}/reenviar`);
          setFeedback({ type: 'success', message: 'Tu solicitud se reenvió y volverá a revisarse.' });
          setTimeout(() => router.push('/solicitante/solicitudes'), 1500);
        } catch (error: any) {
          setFeedback({ type: 'error', message: error.response?.data?.error || 'No pudimos reenviar la solicitud. Inténtalo de nuevo.' });
        } finally {
          setSending(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--auth-vino)' }} />
      </div>
    );
  }

  if (!solicitud) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
        backHref={`/solicitante/solicitudes/${id}`}
        backLabel="Volver al detalle"
        eyebrow={solicitud.folio}
        title="Corregir mi solicitud"
        description="Atiende cada observación, actualiza los documentos que hagan falta y vuelve a enviarla."
        actions={
          <span className={`inline-flex h-7 items-center rounded-md px-3 text-xs font-semibold ${estadoBadgeClass(solicitud.estado)}`}>
            {estadoLabel(solicitud.estado)}
          </span>
        }
      />

      {Array.isArray(solicitud.observaciones) && solicitud.observaciones.length > 0 && (
        <Card style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
          <CardHeader>
            <CardTitle>
              <AlertCircle className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
              Lo que hay que corregir
            </CardTitle>
            <CardDescription>
              Haz los cambios que se indican y después reenvía tu solicitud.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {solicitud.observaciones.map((obs: any, idx: number) => (
              <div key={idx} className="rounded-[16px] bg-[var(--app-card-bg)] border border-[var(--app-rule)] p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--app-ink)]">
                      {obs.campo ? String(obs.campo).replace(/_/g, ' ') : 'Observación general'}
                    </p>
                    <p className="text-sm text-[var(--app-ink-2)] mt-1">{obs.comentario}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs shrink-0 border-[var(--app-rule)] text-[var(--app-ink-2)]">
                    {obs.tipo || 'documental'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Datos del proyecto
          </CardTitle>
          <CardDescription>Revisa que la información ya tenga las correcciones que te pidieron.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)]">Título</p>
            <p className="text-sm text-[var(--app-ink)]">{solicitud.titulo_proyecto}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)]">Descripción</p>
            <p className="text-sm text-[var(--app-ink)] whitespace-pre-wrap">{solicitud.descripcion_proyecto}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)]">Monto solicitado</p>
            <p className="text-sm font-semibold text-[var(--app-ink)]">{formatCurrency(Number(solicitud.monto_solicitado))}</p>
          </div>
        </CardContent>
      </Card>

      <DocumentosAdjuntos
        solicitudId={parseInt(id)}
        tipoProgramaId={solicitud?.convocatoria?.tipo_programa_id || 1}
        documentos={solicitud?.documentos || []}
        onUpload={() => {
          window.location.reload();
        }}
        readonly={false}
      />

      <Card style={{ backgroundColor: 'var(--tile-sky-bg)' }}>
        <CardHeader>
          <CardTitle>
            <ListChecks className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Próximos pasos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--app-ink)] space-y-2">
          {[
            'Lee todas las observaciones de arriba.',
            'Haz los cambios necesarios en tu solicitud.',
            'Sube o actualiza los documentos que se piden.',
            'Presiona "Reenviar solicitud" para continuar.',
            `${INSTITUTION.name} revisará de nuevo tu solicitud corregida.`,
          ].map((paso) => (
            <p key={paso} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--tile-sky-fg)' }} aria-hidden="true" /> <span>{paso}</span>
            </p>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link href={`/solicitante/solicitudes/${id}`}>
          <Button variant="outline" className="w-full sm:w-auto">
            Volver
          </Button>
        </Link>
        <Button
          onClick={handleReenviar}
          disabled={sending}
          className="w-full sm:w-auto"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Reenviar solicitud
        </Button>
      </div>
    </div>
  );
}
