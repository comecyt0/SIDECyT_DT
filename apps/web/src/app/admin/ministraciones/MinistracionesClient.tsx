'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banknote, Eye, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import type { Ministracion } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import PaginationControls from '@/components/ui/pagination-controls';
import { DataCardGrid } from '@/components/ui/DataCardGrid';

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
      description: `¿Confirmar cambio de estado a "${nuevoEstado.toUpperCase()}"?`,
      action: async () => {
        setUpdating(id);
        try {
          await api.put(`/admin/ministraciones/${id}`, { estado: nuevoEstado });
          router.refresh();
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al actualizar ministración';
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Ministraciones</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Gestión de pagos y liberación de fondos a proyectos aprobados.</p>
        </div>
      </div>

      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm relative overflow-hidden ring-1 ring-black/5">
        <div className="bg-gradient-to-r from-accent/20 to-transparent h-1 w-full absolute top-0" />
        <CardHeader className="bg-white/50 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            Pagos y Comprobantes
          </CardTitle>
          <CardDescription>Revisa los documentos subidos por los solicitantes y actualiza el estado de cada pago.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
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
              <div className="p-16 text-center text-neutral-500 dark:text-neutral-400">
                <Banknote className="h-12 w-12 mx-auto mb-3 text-neutral-200" />
                <p className="font-medium">No hay ministraciones registradas.</p>
                <p className="text-xs text-neutral-400 mt-1">Requiere solicitudes en estado &quot;aprobada&quot;.</p>
              </div>
            }
            renderCard={(min) => {
              const documentos = [
                { url: min.carta_compromiso_url, label: 'Carta' },
                { url: min.caratula_banco_url, label: 'Banco' },
                { url: min.constancia_fiscal_url, label: 'Fiscal' },
                { url: min.factura_institucion_url, label: 'Factura' },
              ].filter((d) => !!d.url);
              return (
                <div className="pl-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono block">
                        {min.solicitud?.folio || `ID:${min.solicitud_id}`}
                      </span>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate mt-0.5">
                        {min.solicitud?.user?.empresa?.nombre || 'Sin empresa'}
                      </h3>
                    </div>
                    <Badge variant={min.estado === 'rechazada' ? 'destructive' : 'default'} className="shrink-0 text-[10px]">
                      {min.estado?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">CLABE</span>
                    <span className="font-mono text-xs text-neutral-700 dark:text-neutral-200">
                      {min.cuenta_clabe || <span className="text-neutral-400 italic">Sin registrar</span>}
                    </span>
                  </div>
                  <div className="mb-3">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">Documentos</span>
                    <div className="flex gap-1 flex-wrap">
                      {documentos.length > 0 ? documentos.map((d, i) => (
                        <a key={i} href={d.url} target="_blank" rel="noreferrer">
                          <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-primary/5">
                            <ExternalLink className="h-2.5 w-2.5" />{d.label}
                          </Badge>
                        </a>
                      )) : (
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">Sin documentos</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 justify-end flex-wrap pt-2 border-t border-neutral-50 dark:border-neutral-800">
                    {min.estado === 'pendiente' && (
                      <Button size="sm" className="text-xs h-7"
                        disabled={updating === min.id}
                        onClick={() => handleEstado(min.id, 'revision')}>
                        {updating === min.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                        En Revisión
                      </Button>
                    )}
                    {min.estado === 'revision' && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                          disabled={updating === min.id} onClick={() => handleEstado(min.id, 'autorizada')}>
                          {updating === min.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          Autorizar
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-7"
                          disabled={updating === min.id} onClick={() => handleEstado(min.id, 'rechazada')}>
                          <XCircle className="h-3 w-3 mr-1" />Rechazar
                        </Button>
                      </>
                    )}
                    {min.estado === 'autorizada' && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                        disabled={updating === min.id} onClick={() => handleEstado(min.id, 'pagada')}>
                        {updating === min.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Banknote className="h-3 w-3 mr-1" />}
                        Marcar Pagada
                      </Button>
                    )}
                    {(min.estado === 'pagada' || min.estado === 'rechazada') && (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 italic">Finalizado</span>
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
