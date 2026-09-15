'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StepFrame from '@/components/ui/step-frame';
import PageHeader from '@/components/ui/page-header';
import { FileText, Eye, Search } from 'lucide-react';
import api from '@/lib/api';

const INFORME_ESTADO: Record<string, { label: string; badge: string }> = {
  pendiente: { label: 'Pendiente de entrega', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  en_revision: { label: 'En revisión', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  aprobado: { label: 'Aprobado', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rechazado: { label: 'Necesita correcciones', badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const informeEstadoLabel = (estado: string) => INFORME_ESTADO[estado]?.label ?? estado;
const informeEstadoBadge = (estado: string) => INFORME_ESTADO[estado]?.badge ?? 'bg-neutral-100 text-neutral-500';

export interface Informe {
  id: number;
  solicitud_id: number;
  tipo: string;
  fecha_limite_entrega: string;
  fecha_entregado?: string;
  archivo_informe_url?: string;
  archivo_evidencias_url?: string;
  resultados_obtenidos?: string;
  estado: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
  observaciones?: string;
  created_at: string;
  solicitud?: {
    id: number;
    folio: string;
    titulo_proyecto: string;
    monto_solicitado: number;
    empresa?: {
      nombre: string;
    };
  };
}

interface Props {
  informes: Informe[];
}

export default function InformesClient({ informes }: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInforme, setSelectedInforme] = useState<Informe | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [formData, setFormData] = useState({
    estado: '',
    observaciones: '',
  });

  const filteredInformes = informes.filter((informe) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      informe.solicitud?.folio.toLowerCase().includes(searchLower) ||
      informe.solicitud?.titulo_proyecto.toLowerCase().includes(searchLower) ||
      informe.solicitud?.empresa?.nombre.toLowerCase().includes(searchLower);

    const matchesStatus = !statusFilter || informe.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenDetail = (informe: Informe) => {
    setSelectedInforme(informe);
    setFormData({
      estado: informe.estado,
      observaciones: informe.observaciones || '',
    });
    setUpdateError('');
    setUpdateSuccess('');
    setShowDetailModal(true);
  };

  const handleUpdateInforme = async () => {
    if (!selectedInforme) return;

    setUpdateLoading(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const response = await api.put(`/revisor/informes/${selectedInforme.id}`, {
        estado: formData.estado,
        observaciones: formData.observaciones,
      });

      if (response.data?.informe || response.data?.message) {
        setUpdateSuccess('Informe actualizado exitosamente.');
        setTimeout(() => {
          setShowDetailModal(false);
          router.refresh();
        }, 1500);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Error al actualizar informe';
      setUpdateError(errorMsg);
    } finally {
      setUpdateLoading(false);
    }
  };

  const estados = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];
  const total = filteredInformes.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Informes finales"
        description="Revisa los informes finales que entregaron las instituciones; apruébalos o pide correcciones."
        icon={<FileText className="h-5 w-5" />}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-ink-2)] pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar por folio, proyecto o institución"
            placeholder="Buscar por folio, proyecto o institución"
            className="auth-input auth-input-static pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sm:w-64">
          <select
            aria-label="Filtrar por estado del informe"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="auth-input auth-input-static pl-4"
          >
            <option value="">Todos los estados</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>{informeEstadoLabel(estado)}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Informes entregados
          </CardTitle>
          <CardDescription>{total === 1 ? '1 informe' : `${total} informes`} en la lista</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInformes.length === 0 ? (
            <div className="text-center py-14">
              <FileText className="mx-auto h-10 w-10 mb-3 text-[var(--app-ink-2)]" aria-hidden="true" />
              <p className="font-semibold text-[var(--app-ink)]">No hay informes que mostrar</p>
              <p className="text-sm text-[var(--app-ink-2)]">Prueba con otro texto o cambia el filtro de estado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Institución</TableHead>
                  <TableHead>Entregado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInformes.map((informe) => (
                  <TableRow key={informe.id}>
                    <TableCell className="font-mono text-xs font-semibold" style={{ color: 'var(--auth-vino)' }}>{informe.solicitud?.folio || '—'}</TableCell>
                    <TableCell className="max-w-xs truncate font-medium text-[var(--app-ink)]" title={informe.solicitud?.titulo_proyecto}>{informe.solicitud?.titulo_proyecto || '—'}</TableCell>
                    <TableCell className="text-[var(--app-ink-2)]">{informe.solicitud?.empresa?.nombre || '—'}</TableCell>
                    <TableCell className="text-[var(--app-ink-2)]">
                      {informe.fecha_entregado
                        ? new Date(informe.fecha_entregado).toLocaleDateString('es-MX')
                        : 'Todavía no'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${informeEstadoBadge(informe.estado)}`}>
                        {informeEstadoLabel(informe.estado)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => handleOpenDetail(informe)}
                      >
                        <Eye className="h-4 w-4" />
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revisión del informe, por pasos */}
      <StepFrame
        open={showDetailModal && !!selectedInforme}
        title="Revisar informe final"
        icon={<FileText className="h-5 w-5" />}
        intro={<>{selectedInforme?.solicitud?.folio ? <>Solicitud <strong>{selectedInforme.solicitud.folio}</strong>. </> : null}Primero lee lo que entregó la institución; después registra tu decisión. Si pides correcciones, tus observaciones le llegan tal cual las escribas.</>}
        onClose={() => setShowDetailModal(false)}
        onSubmit={handleUpdateInforme}
        submitting={updateLoading}
        submitLabel="Guardar revisión"
        error={updateError || null}
        success={updateSuccess || null}
        steps={[
          {
            key: 'entregado',
            label: 'Lo entregado',
            question: '¿Qué reportó el proyecto?',
            content: selectedInforme ? (
              <>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-[14px] px-4 py-3" style={{ background: 'var(--auth-field)' }}>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Proyecto</dt>
                    <dd className="font-semibold text-[var(--app-ink)] mt-0.5">{selectedInforme.solicitud?.titulo_proyecto}</dd>
                  </div>
                  <div className="rounded-[14px] px-4 py-3" style={{ background: 'var(--auth-field)' }}>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Institución</dt>
                    <dd className="font-semibold text-[var(--app-ink)] mt-0.5">{selectedInforme.solicitud?.empresa?.nombre || '—'}</dd>
                  </div>
                  <div className="rounded-[14px] px-4 py-3" style={{ background: 'var(--auth-field)' }}>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Debía entregarse el</dt>
                    <dd className="font-semibold text-[var(--app-ink)] mt-0.5">{new Date(selectedInforme.fecha_limite_entrega).toLocaleDateString('es-MX')}</dd>
                  </div>
                  <div className="rounded-[14px] px-4 py-3" style={{ background: 'var(--auth-field)' }}>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Se entregó el</dt>
                    <dd className="font-semibold text-[var(--app-ink)] mt-0.5">{selectedInforme.fecha_entregado ? new Date(selectedInforme.fecha_entregado).toLocaleDateString('es-MX') : 'Todavía no'}</dd>
                  </div>
                </dl>
                {selectedInforme.resultados_obtenidos && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--app-ink-2)] mb-1.5">Resultados que reporta</p>
                    <div className="rounded-[14px] px-4 py-3 text-sm text-[var(--app-ink)] whitespace-pre-wrap" style={{ background: 'var(--auth-field)' }}>
                      {selectedInforme.resultados_obtenidos}
                    </div>
                  </div>
                )}
                {(selectedInforme.archivo_informe_url || selectedInforme.archivo_evidencias_url) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedInforme.archivo_informe_url && (
                      <a href={selectedInforme.archivo_informe_url} target="_blank" rel="noreferrer" className="btn-liquid inline-flex items-center gap-2 h-10 px-4 rounded-[14px] border text-sm font-semibold" style={{ borderColor: 'var(--app-rule)', color: 'var(--app-ink)' }}>
                        <FileText className="h-4 w-4" aria-hidden="true" /> Abrir el informe
                      </a>
                    )}
                    {selectedInforme.archivo_evidencias_url && (
                      <a href={selectedInforme.archivo_evidencias_url} target="_blank" rel="noreferrer" className="btn-liquid inline-flex items-center gap-2 h-10 px-4 rounded-[14px] border text-sm font-semibold" style={{ borderColor: 'var(--app-rule)', color: 'var(--app-ink)' }}>
                        <FileText className="h-4 w-4" aria-hidden="true" /> Abrir las evidencias
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : null,
          },
          {
            key: 'decision',
            label: 'Tu decisión',
            question: '¿Se aprueba o necesita correcciones?',
            validate: () => (!formData.estado ? 'Elige qué pasa con el informe.' : null),
            content: (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="inf-estado" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Resultado de la revisión *</label>
                  <select
                    id="inf-estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="auth-input auth-input-static pl-4"
                  >
                    <option value="">Elige una opción…</option>
                    <option value="en_revision">Lo estoy revisando</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Necesita correcciones</option>
                    <option value="pendiente">Sigue pendiente de entrega</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="inf-obs" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Observaciones {formData.estado === 'rechazado' ? '*' : '(opcional)'}</label>
                  <textarea
                    id="inf-obs"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Qué falta o qué hay que corregir, con tus palabras."
                    className="auth-input auth-input-static pl-4 !h-auto min-h-[110px] py-3 resize-y"
                  />
                </div>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
