'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertBox } from '@/components/ui/alert-box';
import { FileText, Loader2, FileSignature, Search, Download, CheckCheck, XCircle, Ban, PlayCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import PaginationControls from '@/components/ui/pagination-controls';
import api from '@/lib/api';
import type { Solicitud } from '@/types/api';
import SavedFiltersBar from '@/components/filters/SavedFiltersBar';
import { estadoLabel } from '@/lib/solicitud-estados';
import { DataCardGrid } from '@/components/ui/DataCardGrid';
import { formatCurrency } from '@/lib/format';

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface Props {
  solicitudes: Solicitud[];
  pagination: PaginationMeta;
  initialSearch: string;
}

export default function SolicitudesClient({ solicitudes, pagination, initialSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [showConvenioModal, setShowConvenioModal] = useState(false);
  const [convenioForm, setConvenioForm] = useState({
    monto_aprobado: '',
    num_tranches: '1',
    observaciones: '',
  });
  const [convenioLoading, setConvenioLoading] = useState(false);
  const [convenioError, setConvenioError] = useState('');
  const [convenioSuccess, setConvenioSuccess] = useState('');
  const [exporting, setExporting] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmClose, setConfirmClose] = useState<{ open: boolean; solicitudId: number | null }>({ open: false, solicitudId: null });
  const [confirmSeguimiento, setConfirmSeguimiento] = useState<{ open: boolean; solicitudId: number | null }>({ open: false, solicitudId: null });
  const [confirmRechazar, setConfirmRechazar] = useState<{ open: boolean; solicitudId: number | null }>({ open: false, solicitudId: null });
  const [confirmCancelar, setConfirmCancelar] = useState<{ open: boolean; solicitudId: number | null }>({ open: false, solicitudId: null });

  // Debounce search → URL
  useEffect(() => {
    if (searchTerm === initialSearch) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (searchTerm) {
        params.set('search', searchTerm);
      } else {
        params.delete('search');
      }
      params.delete('page'); // reset to first page on new search
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const updatePage = (next: { page?: number; per_page?: number }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next.page !== undefined) params.set('page', String(next.page));
    if (next.per_page !== undefined) {
      params.set('per_page', String(next.per_page));
      params.delete('page');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleOpenConvenioModal = (sol: Solicitud) => {
    if (sol.estado !== 'aprobada') {
      setConvenioError('Solo se pueden generar convenios para solicitudes aprobadas.');
      return;
    }
    if (sol.convenio) {
      setConvenioError('Esta solicitud ya tiene un convenio generado.');
      return;
    }
    setSelectedSolicitud(sol);
    setConvenioForm({
      monto_aprobado: sol.monto_solicitado.toString(),
      num_tranches: '1',
      observaciones: '',
    });
    setConvenioError('');
    setConvenioSuccess('');
    setShowConvenioModal(true);
  };

  const handleGenerarConvenio = async () => {
    if (!selectedSolicitud) return;

    if (!convenioForm.monto_aprobado) {
      setConvenioError('El monto aprobado es requerido.');
      return;
    }

    const numTranches = parseInt(convenioForm.num_tranches) || 1;
    if (numTranches < 1 || numTranches > 12) {
      setConvenioError('Las tranches deben estar entre 1 y 12.');
      return;
    }

    setConvenioLoading(true);
    setConvenioError('');
    setConvenioSuccess('');

    try {
      const response = await api.post(
        `/admin/solicitudes/${selectedSolicitud.id}/generar-convenio`,
        {
          monto_aprobado: parseFloat(convenioForm.monto_aprobado),
          num_tranches: numTranches,
          observaciones: convenioForm.observaciones,
        }
      );

      if (response.data?.convenio) {
        setConvenioSuccess(`Convenio ${response.data.convenio.numero_convenio} generado exitosamente.`);
        setTimeout(() => {
          setShowConvenioModal(false);
          router.refresh();
        }, 2000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Error al generar convenio';
      setConvenioError(errorMsg);
    } finally {
      setConvenioLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/admin/reportes/excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `solicitudes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  const handleCerrar = async (solicitudId: number) => {
    setClosingId(solicitudId);
    try {
      await api.post(`/admin/solicitudes/${solicitudId}/cerrar`);
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setClosingId(null);
    }
  };

  const handleIniciarSeguimiento = async (solicitudId: number) => {
    setActionLoading(solicitudId);
    try {
      await api.post(`/admin/solicitudes/${solicitudId}/seguimiento`);
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleRechazar = async (solicitudId: number) => {
    setActionLoading(solicitudId);
    try {
      await api.post(`/admin/solicitudes/${solicitudId}/rechazar`);
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelar = async (solicitudId: number) => {
    setActionLoading(solicitudId);
    try {
      await api.post(`/admin/solicitudes/${solicitudId}/cancelar`);
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return 'secondary';
      case 'enviada':
        return 'default';
      case 'observada':
        return 'outline';
      case 'en_evaluacion':
        return 'default';
      case 'aprobada':
        return 'default';
      case 'rechazada':
        return 'destructive';
      case 'convenio':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const canGenerateConvenio = (sol: Solicitud) => {
    return sol.estado === 'aprobada' && !sol.convenio;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Administración de Solicitudes</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Gestiona solicitudes, genera convenios y monitorea estados.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 border-neutral-200 dark:border-neutral-700 hover:border-primary/30 hover:text-primary"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </Button>
      </div>

      {/* Search Bar + Saved Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          <Input
            placeholder="Buscar por folio, proyecto o empresa..."
            className="pl-10 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <SavedFiltersBar
          scope="admin.solicitudes"
          currentFilters={{ search: searchTerm }}
          onApply={(f) => setSearchTerm(String(f.search ?? ''))}
        />
      </div>

      {/* Solicitudes Table */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Solicitudes ({pagination.total})
          </CardTitle>
          <CardDescription>Listado de solicitudes con opciones de gestión</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataCardGrid
            items={solicitudes}
            getKey={(s) => s.id}
            columns={2}
            accentColor={(s) => {
              if (['cerrada', 'aprobada'].includes(s.estado)) return 'emerald';
              if (['rechazada', 'cancelada'].includes(s.estado)) return 'red';
              if (['observada', 'enviada'].includes(s.estado)) return 'amber';
              if (s.estado === 'en_evaluacion') return 'purple';
              if (['convenio', 'ministracion', 'seguimiento'].includes(s.estado)) return 'sky';
              return 'neutral';
            }}
            emptyState={
              <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
                <FileText className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
                <p>No hay solicitudes que coincidan con tu búsqueda.</p>
              </div>
            }
            renderCard={(sol) => (
              <div className="pl-3">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono">{sol.folio}</span>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-tight mt-0.5 line-clamp-2">{sol.titulo_proyecto}</h3>
                  </div>
                  <Badge variant={getEstadoBadgeVariant(sol.estado)} className="shrink-0 text-[10px]">
                    {estadoLabel(sol.estado).toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">Empresa</span>
                    <span className="text-neutral-700 dark:text-neutral-200 truncate block">{sol.empresa?.nombre || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">Monto</span>
                    <span className="text-neutral-700 dark:text-neutral-200 font-semibold tabular-nums">{formatCurrency(sol.monto_solicitado || 0)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-neutral-50 dark:border-neutral-800 flex-wrap">
                  {canGenerateConvenio(sol) && (
                    <Button size="sm" className="h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleOpenConvenioModal(sol)}>
                      <FileSignature className="h-3.5 w-3.5 mr-1" /> Convenio
                    </Button>
                  )}
                  {sol.convenio && <Badge variant="outline" className="text-[10px]">✓ Convenio</Badge>}
                  {sol.estado === 'ministracion' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                      disabled={actionLoading === sol.id} onClick={() => setConfirmSeguimiento({ open: true, solicitudId: sol.id })}>
                      {actionLoading === sol.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <PlayCircle className="h-3.5 w-3.5 mr-1" />}
                      Seguimiento
                    </Button>
                  )}
                  {(sol.estado === 'ministracion' || sol.estado === 'seguimiento') && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      disabled={closingId === sol.id} onClick={() => setConfirmClose({ open: true, solicitudId: sol.id })}>
                      {closingId === sol.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCheck className="h-3.5 w-3.5 mr-1" />}
                      Cerrar
                    </Button>
                  )}
                  {['enviada', 'en_evaluacion', 'aprobada'].includes(sol.estado) && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      disabled={actionLoading === sol.id} onClick={() => setConfirmRechazar({ open: true, solicitudId: sol.id })}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
                    </Button>
                  )}
                  {['borrador', 'enviada', 'observada', 'en_evaluacion'].includes(sol.estado) && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                      disabled={actionLoading === sol.id} onClick={() => setConfirmCancelar({ open: true, solicitudId: sol.id })}>
                      <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
                    </Button>
                  )}
                </div>
              </div>
            )}
          />
          <PaginationControls
            currentPage={pagination.current_page}
            lastPage={pagination.last_page}
            total={pagination.total}
            perPage={pagination.per_page}
            onPageChange={(p) => updatePage({ page: p })}
            onPerPageChange={(pp) => updatePage({ per_page: pp })}
          />
        </CardContent>
      </Card>

      {/* Convenio Modal */}
      <Dialog open={showConvenioModal} onOpenChange={setShowConvenioModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generar Convenio</DialogTitle>
            <DialogDescription>
              {selectedSolicitud && `Folio: ${selectedSolicitud.folio}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {convenioError && (
              <AlertBox type="error" message={convenioError} />
            )}

            {convenioSuccess && (
              <AlertBox type="success" message={convenioSuccess} />
            )}

            {!convenioSuccess && (
              <>
                {/* Monto Aprobado */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                    Monto Aprobado (MXN) *
                  </label>
                  <Input
                    type="number"
                    value={convenioForm.monto_aprobado}
                    onChange={(e) =>
                      setConvenioForm({
                        ...convenioForm,
                        monto_aprobado: e.target.value,
                      })
                    }
                    placeholder="Ej: 500000"
                    className="border-neutral-300 dark:border-neutral-600"
                  />
                </div>

                {/* Número de Tranches */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                    Número de Tranches (1-12) *
                  </label>
                  <select
                    value={convenioForm.num_tranches}
                    onChange={(e) =>
                      setConvenioForm({
                        ...convenioForm,
                        num_tranches: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} Tranche{num > 1 ? 's' : ''} (${((parseFloat(convenioForm.monto_aprobado) || 0) / num).toLocaleString()} c/u)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={convenioForm.observaciones}
                    onChange={(e) =>
                      setConvenioForm({
                        ...convenioForm,
                        observaciones: e.target.value,
                      })
                    }
                    placeholder="Notas adicionales sobre el convenio..."
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm resize-none h-24"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowConvenioModal(false)}
                    disabled={convenioLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGenerarConvenio}
                    disabled={convenioLoading}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {convenioLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <FileSignature className="h-4 w-4 mr-2" />
                        Generar Convenio
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Dialog */}
      <ConfirmDialog
        open={confirmClose.open}
        title="Cerrar Proyecto"
        description="¿Confirmas el cierre de este proyecto? El estado cambiará a CERRADA y no podrá revertirse."
        confirmLabel="Sí, Cerrar Proyecto"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={() => {
          if (confirmClose.solicitudId !== null) handleCerrar(confirmClose.solicitudId);
          setConfirmClose({ open: false, solicitudId: null });
        }}
        onCancel={() => setConfirmClose({ open: false, solicitudId: null })}
      />

      {/* Confirm Seguimiento Dialog */}
      <ConfirmDialog
        open={confirmSeguimiento.open}
        title="Iniciar Seguimiento"
        description="La solicitud pasará al estado SEGUIMIENTO indicando que el informe final está pendiente."
        confirmLabel="Iniciar Seguimiento"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={() => {
          if (confirmSeguimiento.solicitudId !== null) handleIniciarSeguimiento(confirmSeguimiento.solicitudId);
          setConfirmSeguimiento({ open: false, solicitudId: null });
        }}
        onCancel={() => setConfirmSeguimiento({ open: false, solicitudId: null })}
      />

      {/* Confirm Rechazar Dialog */}
      <ConfirmDialog
        open={confirmRechazar.open}
        title="Rechazar Solicitud"
        description="La solicitud cambiará a estado RECHAZADA. Esta acción no puede revertirse fácilmente."
        confirmLabel="Sí, Rechazar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={() => {
          if (confirmRechazar.solicitudId !== null) handleRechazar(confirmRechazar.solicitudId);
          setConfirmRechazar({ open: false, solicitudId: null });
        }}
        onCancel={() => setConfirmRechazar({ open: false, solicitudId: null })}
      />

      {/* Confirm Cancelar Dialog */}
      <ConfirmDialog
        open={confirmCancelar.open}
        title="Cancelar Solicitud"
        description="La solicitud cambiará a estado CANCELADA. El solicitante será notificado."
        confirmLabel="Sí, Cancelar"
        cancelLabel="Mantener"
        variant="destructive"
        onConfirm={() => {
          if (confirmCancelar.solicitudId !== null) handleCancelar(confirmCancelar.solicitudId);
          setConfirmCancelar({ open: false, solicitudId: null });
        }}
        onCancel={() => setConfirmCancelar({ open: false, solicitudId: null })}
      />
    </div>
  );
}
