'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertBox } from '@/components/ui/alert-box';
import { FileText, Eye, Loader2, Search } from 'lucide-react';
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

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Revisión de Informe Final</DialogTitle>
            <DialogDescription>
              {selectedInforme && `Folio: ${selectedInforme.solicitud?.folio}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {updateError && <AlertBox type="error" message={updateError} />}
            {updateSuccess && <AlertBox type="success" message={updateSuccess} />}

            {!updateSuccess && selectedInforme && (
              <>
                {/* Solicitud Info */}
                <div className="space-y-3 border-b pb-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Información de Solicitud</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Folio</p>
                      <p className="font-medium">{selectedInforme.solicitud?.folio}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Institución</p>
                      <p className="font-medium">{selectedInforme.solicitud?.empresa?.nombre}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-neutral-500 dark:text-neutral-400">Proyecto</p>
                      <p className="font-medium">{selectedInforme.solicitud?.titulo_proyecto}</p>
                    </div>
                  </div>
                </div>

                {/* Informe Info */}
                <div className="space-y-3 border-b pb-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Información del Informe</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Tipo</p>
                      <p className="font-medium">{selectedInforme.tipo || 'Final'}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Fecha Límite de Entrega</p>
                      <p className="font-medium">
                        {new Date(selectedInforme.fecha_limite_entrega).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    {selectedInforme.fecha_entregado && (
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Fecha Entregado</p>
                        <p className="font-medium">
                          {new Date(selectedInforme.fecha_entregado).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resultados */}
                {selectedInforme.resultados_obtenidos && (
                  <div className="space-y-3 border-b pb-4">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Resultados Obtenidos</h3>
                    <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap">
                      {selectedInforme.resultados_obtenidos}
                    </div>
                  </div>
                )}

                {/* Status Update */}
                <div className="space-y-3 border-b pb-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Cambiar Estado</h3>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm"
                  >
                    <option value="">Seleccionar estado...</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_revision">En Revisión</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>

                {/* Observaciones */}
                <div className="space-y-3 border-b pb-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Observaciones de Revisión</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Escribe observaciones si el informe necesita correcciones..."
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm resize-none h-24"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowDetailModal(false)} disabled={updateLoading}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpdateInforme}
                    disabled={updateLoading}
                    className={`${colorMap.accent.background} hover:opacity-90`}
                  >
                    {updateLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Revisión'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
