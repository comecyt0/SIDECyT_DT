'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/page-header';
import { Banknote, Eye, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import type { Ministracion } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import PaginationControls from '@/components/ui/pagination-controls';
import { DataCardGrid } from '@/components/ui/DataCardGrid';
import { safeUrl } from '@/lib/safe-url';

const ESTADO_MINISTRACION: Record<string, { label: string; tone: string }> = {
  pendiente: { label: 'Pendiente', tone: 'neutral' },
  revision: { label: 'En revisión', tone: 'amber' },
  autorizada: { label: 'Autorizada', tone: 'sky' },
  pagada: { label: 'Pagada', tone: 'emerald' },
  rechazada: { label: 'Rechazada', tone: 'red' },
};

const estadoLabel = (estado?: string) => (estado ? ESTADO_MINISTRACION[estado]?.label ?? estado : '—');

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface Props {
  ministraciones: Ministracion[];
  pagination: PaginationMeta;
}

export default function MinistracionesClient({ ministraciones, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [updating, setUpdating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, action: () => void, title: string, description: string}>({open: false, action: () => {}, title: '', description: ''});

  const updateSearchParams = (next: { page?: number; per_page?: number }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next.page !== undefined) params.set('page', String(next.page));
    if (next.per_page !== undefined) params.set('per_page', String(next.per_page));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleEstado = (id: number, nuevoEstado: string) => {
    setConfirmState({
      open: true,
      title: 'Cambiar estado',
      description: `La ministración pasará a «${estadoLabel(nuevoEstado)}». ¿Quieres continuar?`,
      action: async () => {
        setUpdating(id);
        try {
          await api.put(`/admin/ministraciones/${id}`, { estado: nuevoEstado });
          router.refresh();
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo actualizar la ministración. Inténtalo de nuevo.';
          setFeedback({ type: 'error', message: msg });
        } finally {
          setUpdating(null);
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.action(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="default"
      />
      <PageHeader
        title="Ministraciones"
        description="Cada ministración es un pago del apoyo. Revisa los documentos que subió el solicitante y registra el avance de cada uno."
        icon={<Banknote className="h-5 w-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <Banknote className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Pagos y comprobantes
          </CardTitle>
          <CardDescription>Revisa los documentos y actualiza el estado de cada pago: en revisión, autorizada, pagada o rechazada.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataCardGrid
            items={ministraciones}
            getKey={(m) => m.id}
            columns={2}
            accentColor={(m) => {
              if (m.estado === 'pagada') return 'emerald';
              if (m.estado === 'rechazada') return 'red';
              if (m.estado === 'autorizada') return 'sky';
              if (m.estado === 'revision') return 'amber';
              return 'neutral';
            }}
            emptyState={
              <div className="empty-state">
                <span className="tone-chip" data-tone="violet"><Banknote aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">Sin ministraciones todavía</p>
                <p className="text-sm text-[var(--app-ink-2)]">Aparecen cuando una solicitud aprobada genera su convenio.</p>
              </div>
            }
            renderCard={(min) => {
              const documentos = [
                { url: min.carta_compromiso_url, label: 'Carta compromiso' },
                { url: min.caratula_banco_url, label: 'Carátula bancaria' },
                { url: min.constancia_fiscal_url, label: 'Constancia fiscal' },
                { url: min.factura_institucion_url, label: 'Factura' },
              ].filter((d) => !!d.url);
              const cfg = ESTADO_MINISTRACION[min.estado] ?? { label: min.estado, tone: 'neutral' };
              return (
                <div className="pl-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest font-mono block" style={{ color: 'var(--auth-vino)' }}>
                        {min.solicitud?.folio || `Solicitud nº ${min.solicitud_id}`}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--app-ink)] truncate mt-0.5">
                        {min.solicitud?.user?.empresa?.nombre || 'Sin empresa'}
                      </h3>
                    </div>
                    <span className="pill shrink-0" data-tone={cfg.tone}>{cfg.label}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--app-ink-2)] block">CLABE</span>
                    <span className="font-mono text-xs text-[var(--app-ink)]">
                      {min.cuenta_clabe || <span className="text-[var(--app-ink-2)] italic">Sin registrar</span>}
                    </span>
                  </div>
                  <div className="mb-3">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--app-ink-2)] block mb-1">Documentos</span>
                    <div className="flex gap-1 flex-wrap">
                      {documentos.length > 0 ? documentos.map((d, i) => (
                        <a key={i} href={safeUrl(d.url) ?? '#'} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="gap-1 cursor-pointer">
                            <ExternalLink className="h-2.5 w-2.5" />{d.label}
                          </Badge>
                        </a>
                      )) : (
                        <span className="text-[11px] text-[var(--app-ink-2)] italic">Sin documentos</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 justify-end flex-wrap pt-3 border-t" style={{ borderColor: 'var(--app-rule)' }}>
                    {min.estado === 'pendiente' && (
                      <Button size="sm" variant="soft"
                        disabled={updating === min.id}
                        onClick={() => handleEstado(min.id, 'revision')}>
                        {updating === min.id ? <Loader2 className="animate-spin" /> : <Eye />}
                        Pasar a revisión
                      </Button>
                    )}
                    {min.estado === 'revision' && (
                      <>
                        <Button size="sm"
                          disabled={updating === min.id} onClick={() => handleEstado(min.id, 'autorizada')}>
                          {updating === min.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                          Autorizar
                        </Button>
                        <Button size="sm" variant="destructive"
                          disabled={updating === min.id} onClick={() => handleEstado(min.id, 'rechazada')}>
                          <XCircle />Rechazar
                        </Button>
                      </>
                    )}
                    {min.estado === 'autorizada' && (
                      <Button size="sm"
                        disabled={updating === min.id} onClick={() => handleEstado(min.id, 'pagada')}>
                        {updating === min.id ? <Loader2 className="animate-spin" /> : <Banknote />}
                        Marcar como pagada
                      </Button>
                    )}
                    {(min.estado === 'pagada' || min.estado === 'rechazada') && (
                      <span className="text-xs text-[var(--app-ink-2)] italic">Sin acciones pendientes</span>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <PaginationControls
            currentPage={pagination.current_page}
            lastPage={pagination.last_page}
            total={pagination.total}
            perPage={pagination.per_page}
            onPageChange={(p) => updateSearchParams({ page: p })}
            onPerPageChange={(pp) => updateSearchParams({ page: 1, per_page: pp })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
