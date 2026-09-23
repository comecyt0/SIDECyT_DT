'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StepFrame from '@/components/ui/step-frame';
import PageHeader from '@/components/ui/page-header';
import { FileText, Loader2, FileSignature, Search, Download, CheckCheck, XCircle, Ban, PlayCircle, Check } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import PaginationControls from '@/components/ui/pagination-controls';
import api from '@/lib/api';
import type { Solicitud } from '@/types/api';
import SavedFiltersBar from '@/components/filters/SavedFiltersBar';
import { estadoLabel, estadoBadgeClass } from '@/lib/solicitud-estados';
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
      setConvenioError('Indica el monto aprobado.');
      return;
    }

    const numTranches = parseInt(convenioForm.num_tranches) || 1;
    if (numTranches < 1 || numTranches > 12) {
      setConvenioError('El número de entregas debe estar entre 1 y 12.');
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
        setConvenioSuccess(`Listo: se generó el convenio ${response.data.convenio.numero_convenio}.`);
        setTimeout(() => {
          setShowConvenioModal(false);
          router.refresh();
        }, 2000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'No se pudo generar el convenio. Inténtalo de nuevo.';
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

  const canGenerateConvenio = (sol: Solicitud) => {
    return sol.estado === 'aprobada' && !sol.convenio;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Solicitudes"
        description="Revisa cada solicitud, genera su convenio cuando esté aprobada y sigue su avance hasta el cierre."
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Exportando…' : 'Exportar a Excel'}
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-ink-2)] pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar solicitudes"
            placeholder="Buscar por folio, proyecto o empresa"
            className="auth-input auth-input-static pl-10"
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

      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Solicitudes ({pagination.total})
          </CardTitle>
          <CardDescription>Cada tarjeta muestra el estado de la solicitud y las acciones que puedes tomar.</CardDescription>
        </CardHeader>
        <CardContent>
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
              <div className="empty-state">
                <span className="tone-chip" data-tone={searchTerm ? 'sky' : 'violet'}><FileText aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">
                  {searchTerm ? 'Ninguna solicitud coincide con tu búsqueda' : 'Sin solicitudes todavía'}
                </p>
                <p className="text-sm text-[var(--app-ink-2)]">
                  {searchTerm ? 'Prueba con otro folio, proyecto o empresa.' : 'Aparecen cuando un solicitante envía su proyecto a una convocatoria.'}
                </p>
              </div>
            }
            renderCard={(sol) => (
              <div className="pl-3">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--auth-vino)' }}>{sol.folio}</span>
                    <h3 className="text-sm font-bold text-[var(--app-ink)] leading-tight mt-0.5 line-clamp-2">{sol.titulo_proyecto}</h3>
                  </div>
                  <span className={`shrink-0 ${estadoBadgeClass(sol.estado)}`}>
                    {estadoLabel(sol.estado)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--app-ink-2)] block">Empresa</span>
                    <span className="text-[var(--app-ink)] truncate block">{sol.empresa?.nombre || 'Sin empresa'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--app-ink-2)] block">Monto solicitado</span>
                    <span className="text-[var(--app-ink)] font-semibold tabular-nums">{formatCurrency(sol.monto_solicitado || 0)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-3 border-t flex-wrap" style={{ borderColor: 'var(--app-rule)' }}>
                  {canGenerateConvenio(sol) && (
                    <Button size="sm" onClick={() => handleOpenConvenioModal(sol)}>
                      <FileSignature /> Generar convenio
                    </Button>
                  )}
                  {sol.convenio && <Badge variant="outline"><Check aria-hidden="true" /> Con convenio</Badge>}
                  {sol.estado === 'ministracion' && (
                    <Button size="sm" variant="soft"
                      disabled={actionLoading === sol.id} onClick={() => setConfirmSeguimiento({ open: true, solicitudId: sol.id })}>
                      {actionLoading === sol.id ? <Loader2 className="animate-spin" /> : <PlayCircle />}
                      Iniciar seguimiento
                    </Button>
                  )}
                  {(sol.estado === 'ministracion' || sol.estado === 'seguimiento') && (
                    <Button size="sm" variant="soft"
                      disabled={closingId === sol.id} onClick={() => setConfirmClose({ open: true, solicitudId: sol.id })}>
                      {closingId === sol.id ? <Loader2 className="animate-spin" /> : <CheckCheck />}
                      Cerrar
                    </Button>
                  )}
                  {['enviada', 'en_evaluacion', 'aprobada'].includes(sol.estado) && (
                    <Button size="sm" variant="destructive"
                      disabled={actionLoading === sol.id} onClick={() => setConfirmRechazar({ open: true, solicitudId: sol.id })}>
                      <XCircle /> Rechazar
                    </Button>
                  )}
                  {['borrador', 'enviada', 'observada', 'en_evaluacion'].includes(sol.estado) && (
                    <Button size="sm" variant="ghost"
                      disabled={actionLoading === sol.id} onClick={() => setConfirmCancelar({ open: true, solicitudId: sol.id })}>
                      <Ban /> Cancelar
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

      {/* Convenio, por pasos */}
      <StepFrame
        open={showConvenioModal}
        size="md"
        title="Generar convenio"
        icon={<FileSignature className="h-5 w-5" />}
        intro={<>{selectedSolicitud ? <>Solicitud <strong>{selectedSolicitud.folio}</strong>. </> : null}El convenio fija <strong>cuánto se aprueba y en cuántas entregas</strong> se paga. Al generarlo se crea el documento y las ministraciones correspondientes.</>}
        onClose={() => setShowConvenioModal(false)}
        onSubmit={handleGenerarConvenio}
        submitting={convenioLoading}
        submitLabel="Generar convenio"
        error={convenioError || null}
        success={convenioSuccess || null}
        steps={[
          {
            key: 'monto',
            label: 'El monto',
            question: '¿Cuánto se aprueba?',
            validate: () => (!convenioForm.monto_aprobado || parseFloat(convenioForm.monto_aprobado) <= 0 ? 'Indica el monto aprobado.' : null),
            content: (
              <div className="space-y-1.5">
                <label htmlFor="conv-monto" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Monto aprobado (MXN) *</label>
                <input
                  id="conv-monto"
                  type="number"
                  min={0}
                  value={convenioForm.monto_aprobado}
                  onChange={(e) => setConvenioForm({ ...convenioForm, monto_aprobado: e.target.value })}
                  placeholder="Ej. 500000"
                  className="auth-input auth-input-static pl-4"
                />
                {selectedSolicitud && (
                  <p className="text-xs text-[var(--app-ink-2)]">Se solicitó {formatCurrency(Number(selectedSolicitud.monto_solicitado))}. Puedes aprobar una cantidad menor.</p>
                )}
              </div>
            ),
          },
          {
            key: 'entregas',
            label: 'Las entregas',
            question: '¿En cuántas entregas se paga?',
            validate: () => {
              const n = parseInt(convenioForm.num_tranches) || 0;
              return n < 1 || n > 12 ? 'Elige entre 1 y 12 entregas.' : null;
            },
            content: (
              <div className="space-y-1.5">
                <label htmlFor="conv-entregas" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Número de entregas *</label>
                <select
                  id="conv-entregas"
                  value={convenioForm.num_tranches}
                  onChange={(e) => setConvenioForm({ ...convenioForm, num_tranches: e.target.value })}
                  className="auth-input auth-input-static pl-4"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num === 1 ? 'Una sola entrega' : `${num} entregas`} · {formatCurrency((parseFloat(convenioForm.monto_aprobado) || 0) / num)} cada una
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--app-ink-2)]">Cada entrega genera su propia ministración y su informe.</p>
              </div>
            ),
          },
          {
            key: 'notas',
            label: 'Notas',
            question: '¿Algo que deba constar en el convenio?',
            content: (
              <div className="space-y-1.5">
                <label htmlFor="conv-notas" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Observaciones (opcional)</label>
                <textarea
                  id="conv-notas"
                  value={convenioForm.observaciones}
                  onChange={(e) => setConvenioForm({ ...convenioForm, observaciones: e.target.value })}
                  placeholder="Condiciones especiales, fechas comprometidas…"
                  className="auth-input auth-input-static pl-4 !h-auto min-h-[110px] py-3 resize-y"
                />
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmClose.open}
        title="Cerrar proyecto"
        description="La solicitud quedará como cerrada y ya no podrá reabrirse. ¿Quieres continuar?"
        confirmLabel="Sí, cerrar"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={() => {
          if (confirmClose.solicitudId !== null) handleCerrar(confirmClose.solicitudId);
          setConfirmClose({ open: false, solicitudId: null });
        }}
        onCancel={() => setConfirmClose({ open: false, solicitudId: null })}
      />

      <ConfirmDialog
        open={confirmSeguimiento.open}
        title="Iniciar seguimiento"
        description="La solicitud pasará a seguimiento: queda pendiente el informe final del proyecto."
        confirmLabel="Iniciar seguimiento"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={() => {
          if (confirmSeguimiento.solicitudId !== null) handleIniciarSeguimiento(confirmSeguimiento.solicitudId);
          setConfirmSeguimiento({ open: false, solicitudId: null });
        }}
        onCancel={() => setConfirmSeguimiento({ open: false, solicitudId: null })}
      />

      <ConfirmDialog
        open={confirmRechazar.open}
        title="Rechazar solicitud"
        description="La solicitud quedará como rechazada y se avisará al solicitante. Esta acción no se puede deshacer."
        confirmLabel="Sí, rechazar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={() => {
          if (confirmRechazar.solicitudId !== null) handleRechazar(confirmRechazar.solicitudId);
          setConfirmRechazar({ open: false, solicitudId: null });
        }}
        onCancel={() => setConfirmRechazar({ open: false, solicitudId: null })}
      />

      <ConfirmDialog
        open={confirmCancelar.open}
        title="Cancelar solicitud"
        description="La solicitud quedará como cancelada y se avisará al solicitante."
        confirmLabel="Sí, cancelar"
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
