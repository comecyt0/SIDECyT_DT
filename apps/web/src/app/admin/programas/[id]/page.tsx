'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { NestedCRUDModal } from '@/components/admin/NestedCRUDModal';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface TipoPrograma {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string;
  tiene_etapas?: boolean;
  tiene_equipo?: boolean;
  activo?: boolean;
}

type TabType = 'info' | 'campos' | 'rubros' | 'etapas' | 'modalidades' | 'criterios';

export default function ProgramaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programaId = params.id as string;

  const [programa, setPrograma] = useState<TipoPrograma | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type TabItem = Record<string, any> & { id: number };
  // Estados por tab
  const [campos, setCampos] = useState<TabItem[]>([]);
  const [rubros, setRubros] = useState<TabItem[]>([]);
  const [etapas, setEtapas] = useState<TabItem[]>([]);
  const [modalidades, setModalidades] = useState<TabItem[]>([]);
  const [criterios, setCriterios] = useState<TabItem[]>([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, action: () => void, title: string, description: string}>({open: false, action: () => {}, title: '', description: ''});

  const fetchPrograma = useCallback(async () => {
    try {
      const { data } = await api.get(`/catalogs/programa/${programaId}`);
      setPrograma(data.data || data);
    } catch (error) {
      console.error('Error cargando programa:', error);
    }
  }, [programaId]);

  const fetchTabData = useCallback(async (tab: TabType) => {
    try {
      const { data } = await api.get(`/admin/programas/${programaId}/${tab}`);
      const items = Array.isArray(data) ? data : data.data || [];

      switch (tab) {
        case 'campos':
          setCampos(items);
          break;
        case 'rubros':
          setRubros(items);
          break;
        case 'etapas':
          setEtapas(items);
          break;
        case 'modalidades':
          setModalidades(items);
          break;
        case 'criterios':
          setCriterios(items);
          break;
      }
    } catch (error) {
      console.error(`Error cargando ${tab}:`, error);
    }
  }, [programaId]);

  useEffect(() => {
    fetchPrograma();
    setLoading(false);
  }, [fetchPrograma]);

  useEffect(() => {
    if (activeTab !== 'info' && activeTab !== 'campos') {
      fetchTabData(activeTab);
    }
  }, [activeTab, fetchTabData]);

  const handleOpenCreate = (tab: TabType) => {
    setModalType('create');
    setEditingId(null);
    setFormData(getEmptyForm(tab));
    setShowModal(true);
  };

  const handleOpenEdit = (tab: TabType, item: any) => {
    setModalType('edit');
    setEditingId(item.id);
    setFormData(item);
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    setSaving(true);
    try {
      const url = `/admin/programas/${programaId}/${activeTab}`;
      if (modalType === 'create') {
        await api.post(url, formData);
      } else {
        await api.put(`${url}/${editingId}`, formData);
      }
      setShowModal(false);
      fetchTabData(activeTab as TabType);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.response?.data?.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar item',
      description: '¿Eliminar este item?',
      action: async () => {
        try {
          await api.delete(`/admin/programas/${programaId}/${activeTab}/${itemId}`);
          fetchTabData(activeTab as TabType);
        } catch (error: any) {
          setFeedback({ type: 'error', message: error.response?.data?.message || 'Error al eliminar' });
        }
      },
    });
  };

  const getEmptyForm = (tab: TabType): any => {
    const forms: Record<TabType, any> = {
      info: {},
      campos: { nombre_campo: '', etiqueta: '', tipo_campo: 'text', orden: 1, requerido: false, activo: true },
      rubros: { clave: '', nombre: '', descripcion: '', activo: true },
      etapas: { numero_etapa: 1, nombre: '', duracion_meses: 1, es_evaluacion_tecnica: false, activo: true },
      modalidades: { clave: '', nombre: '', descripcion: '', activo: true },
      criterios: { nombre: '', descripcion: '', puntaje_maximo: 25, ponderacion: 25, activo: true },
    };
    return forms[tab] || {};
  };

  const getModalFields = (tab: TabType) => {
    const fieldConfigs: Record<TabType, any[]> = {
      info: [],
      campos: [
        { name: 'nombre_campo', label: 'Nombre del Campo', type: 'text', required: true },
        { name: 'etiqueta', label: 'Etiqueta (Label)', type: 'text', required: true },
        { name: 'tipo_campo', label: 'Tipo de Campo', type: 'select', required: true, options: [
          { value: 'text', label: 'Texto' },
          { value: 'number', label: 'Número' },
          { value: 'textarea', label: 'Área de Texto' },
          { value: 'date', label: 'Fecha' },
          { value: 'select', label: 'Selección' },
          { value: 'checkbox', label: 'Casilla' },
          { value: 'email', label: 'Email' },
        ]},
        { name: 'orden', label: 'Orden', type: 'number', required: true },
        { name: 'requerido', label: 'Es requerido', type: 'checkbox' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      rubros: [
        { name: 'clave', label: 'Clave', type: 'text', required: true },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      etapas: [
        { name: 'numero_etapa', label: 'Número de Etapa', type: 'number', required: true },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'duracion_meses', label: 'Duración (meses)', type: 'number' },
        { name: 'es_evaluacion_tecnica', label: 'Es evaluación técnica', type: 'checkbox' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      modalidades: [
        { name: 'clave', label: 'Clave', type: 'text', required: true },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      criterios: [
        { name: 'nombre', label: 'Nombre del Criterio', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
        { name: 'puntaje_maximo', label: 'Puntaje Máximo', type: 'number', required: true },
        { name: 'ponderacion', label: 'Ponderación (%)', type: 'number', required: true },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
    };
    return fieldConfigs[tab] || [];
  };

  const renderTabContent = () => {
    if (activeTab === 'info') {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Clave</h3>
            <p className="text-neutral-900 dark:text-neutral-50">{programa?.clave}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Nombre</h3>
            <p className="text-neutral-900 dark:text-neutral-50">{programa?.nombre}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Descripción</h3>
            <p className="text-neutral-900 dark:text-neutral-50">{programa?.descripcion || 'N/A'}</p>
          </div>
          <div className="flex gap-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Tiene Etapas</h3>
              <Badge variant={programa?.tiene_etapas ? 'default' : 'secondary'}>
                {programa?.tiene_etapas ? 'Sí' : 'No'}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Requiere Equipo</h3>
              <Badge variant={programa?.tiene_equipo ? 'default' : 'secondary'}>
                {programa?.tiene_equipo ? 'Sí' : 'No'}
              </Badge>
            </div>
          </div>
        </div>
      );
    }

    const items =
      activeTab === 'campos'
        ? campos
        : activeTab === 'rubros'
          ? rubros
          : activeTab === 'etapas'
            ? etapas
            : activeTab === 'modalidades'
              ? modalidades
              : criterios;

    return (
      <div>
        <div className="mb-4">
          <Button
            onClick={() => handleOpenCreate(activeTab)}
            className="bg-primary hover:bg-primary-light text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Agregar
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-neutral-500 dark:text-neutral-400 text-center py-6">No hay items registrados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {activeTab === 'campos' && (
                  <>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Requerido</TableHead>
                    <TableHead>Orden</TableHead>
                  </>
                )}
                {activeTab === 'rubros' && (
                  <>
                    <TableHead>Clave</TableHead>
                    <TableHead>Nombre</TableHead>
                  </>
                )}
                {activeTab === 'etapas' && (
                  <>
                    <TableHead>Número</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Duración</TableHead>
                  </>
                )}
                {activeTab === 'modalidades' && (
                  <>
                    <TableHead>Clave</TableHead>
                    <TableHead>Nombre</TableHead>
                  </>
                )}
                {activeTab === 'criterios' && (
                  <>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Puntaje Máx</TableHead>
                    <TableHead>Ponderación</TableHead>
                  </>
                )}
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  {activeTab === 'campos' && (
                    <>
                      <TableCell>{item.nombre_campo}</TableCell>
                      <TableCell><Badge variant="outline">{item.tipo_campo}</Badge></TableCell>
                      <TableCell>{item.requerido ? '✓' : '—'}</TableCell>
                      <TableCell>{item.orden}</TableCell>
                    </>
                  )}
                  {activeTab === 'rubros' && (
                    <>
                      <TableCell className="font-mono text-sm">{item.clave}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                    </>
                  )}
                  {activeTab === 'etapas' && (
                    <>
                      <TableCell>{item.numero_etapa}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>{item.duracion_meses || '—'} meses</TableCell>
                    </>
                  )}
                  {activeTab === 'modalidades' && (
                    <>
                      <TableCell className="font-mono text-sm">{item.clave}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                    </>
                  )}
                  {activeTab === 'criterios' && (
                    <>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>{item.puntaje_maximo}</TableCell>
                      <TableCell>{item.ponderacion}%</TableCell>
                    </>
                  )}
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(activeTab, item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  if (loading || !programa) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-neutral-dark">
          {programa.nombre}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">Gestión de catálogos y configuración del programa</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <div className="flex gap-2 flex-wrap">
            {(['info', 'campos', 'rubros', 'etapas', 'modalidades', 'criterios'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-primary'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {renderTabContent()}
        </CardContent>
      </Card>

      <NestedCRUDModal
        isOpen={showModal}
        title={`${modalType === 'create' ? 'Crear' : 'Editar'} ${activeTab}`}
        fields={getModalFields(activeTab as TabType)}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleSaveItem}
        onClose={() => setShowModal(false)}
        loading={saving}
      />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.action(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="destructive"
      />
    </div>
  );
}
