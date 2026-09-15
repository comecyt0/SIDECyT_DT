'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StepFrame from '@/components/ui/step-frame';
import { FileText, Eye, Search } from 'lucide-react';
import api from '@/lib/api';
import { colorMap } from '@/lib/color-mapper';

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

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'outline';
      case 'en_revision':
        return 'default';
      case 'aprobado':
        return 'default';
      case 'rechazado':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const estados = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Revisión de Informes Finales</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Revisa y aprueba los informes finales entregados por los solicitantes.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          <Input
            placeholder="Buscar por folio, proyecto o institución..."
            className="pl-10 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === ''
                ? `${colorMap.primary.background} text-white`
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            Todos
          </button>
          {estados.map((estado) => (
            <button
              key={estado}
              onClick={() => setStatusFilter(estado)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === estado
                  ? `${colorMap.primary.background} text-white`
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              {estado === 'en_revision' ? 'En Revisión' : estado.charAt(0).toUpperCase() + estado.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Informes Table */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informes ({filteredInformes.length})
          </CardTitle>
          <CardDescription>Listado de informes finales entregados por solicitantes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInformes.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
              <FileText className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
              <p>No hay informes que coincidan con tu búsqueda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
                <TableRow>
                  <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Folio</TableHead>
                  <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Proyecto</TableHead>
                  <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Institución</TableHead>
                  <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Entregado</TableHead>
                  <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Estado</TableHead>
                  <TableHead className="font-bold text-neutral-700 dark:text-neutral-200 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInformes.map((informe) => (
                  <TableRow key={informe.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <TableCell className="font-medium text-neutral-600 dark:text-neutral-300">{informe.solicitud?.folio || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">{informe.solicitud?.titulo_proyecto || 'N/A'}</TableCell>
                    <TableCell>{informe.solicitud?.empresa?.nombre || 'N/A'}</TableCell>
                    <TableCell className="text-sm">
                      {informe.fecha_entregado
                        ? new Date(informe.fecha_entregado).toLocaleDateString('es-MX')
                        : 'Pendiente'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoBadgeVariant(informe.estado)}>
                        {informe.estado === 'en_revision' ? 'EN REVISIÓN' : informe.estado.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-primary hover:bg-primary/10"
                        onClick={() => handleOpenDetail(informe)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
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
