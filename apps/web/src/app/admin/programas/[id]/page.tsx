'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/page-header';
import { Loader2, Plus, Edit, Trash2, Check, Inbox } from 'lucide-react';
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

const TAB_LABELS: Record<TabType, string> = {
  info: 'Datos generales',
  campos: 'Preguntas',
  rubros: 'Conceptos de gasto',
  etapas: 'Etapas',
  modalidades: 'Modalidades',
  criterios: 'Criterios',
};

const TAB_TITLES: Record<TabType, { create: string; edit: string }> = {
  info: { create: 'Datos generales', edit: 'Datos generales' },
  campos: { create: 'Nueva pregunta', edit: 'Editar pregunta' },
  rubros: { create: 'Nuevo concepto de gasto', edit: 'Editar concepto de gasto' },
  etapas: { create: 'Nueva etapa', edit: 'Editar etapa' },
  modalidades: { create: 'Nueva modalidad', edit: 'Editar modalidad' },
  criterios: { create: 'Nuevo criterio', edit: 'Editar criterio' },
};

const TIPO_CAMPO_LABELS: Record<string, string> = {
  text: 'Texto corto',
  number: 'Número',
  textarea: 'Texto largo',
  date: 'Fecha',
  select: 'Lista de opciones',
  checkbox: 'Casilla',
  email: 'Correo electrónico',
};

export default function ProgramaDetailPage() {
  const params = useParams();
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
      setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo guardar. Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar registro',
      description: 'Se quitará de este programa. Esta acción no se puede deshacer.',
      action: async () => {
        try {
          await api.delete(`/admin/programas/${programaId}/${activeTab}/${itemId}`);
          fetchTabData(activeTab as TabType);
        } catch (error: any) {
          setFeedback({ type: 'error', message: error.response?.data?.message || 'No se pudo eliminar. Inténtalo de nuevo.' });
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
        { name: 'nombre_campo', label: 'Identificador', type: 'text', required: true },
        { name: 'etiqueta', label: 'Texto de la pregunta', type: 'text', required: true },
        { name: 'tipo_campo', label: 'Tipo de respuesta', type: 'select', required: true, options: [
          { value: 'text', label: 'Texto corto' },
          { value: 'number', label: 'Número' },
          { value: 'textarea', label: 'Texto largo' },
          { value: 'date', label: 'Fecha' },
          { value: 'select', label: 'Lista de opciones' },
          { value: 'checkbox', label: 'Casilla' },
          { value: 'email', label: 'Correo electrónico' },
        ]},
        { name: 'orden', label: 'Posición', type: 'number', required: true },
        { name: 'requerido', label: 'Es obligatoria', type: 'checkbox' },
        { name: 'activo', label: 'Activa', type: 'checkbox' },
      ],
      rubros: [
        { name: 'clave', label: 'Clave', type: 'text', required: true },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      etapas: [
        { name: 'numero_etapa', label: 'Número de etapa', type: 'number', required: true },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'duracion_meses', label: 'Duración (meses)', type: 'number' },
        { name: 'es_evaluacion_tecnica', label: 'Es de evaluación técnica', type: 'checkbox' },
        { name: 'activo', label: 'Activa', type: 'checkbox' },
      ],
      modalidades: [
        { name: 'clave', label: 'Clave', type: 'text', required: true },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      criterios: [
        { name: 'nombre', label: 'Nombre del criterio', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
        { name: 'puntaje_maximo', label: 'Calificación máxima', type: 'number', required: true },
        { name: 'ponderacion', label: 'Peso (%)', type: 'number', required: true },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
    };
    return fieldConfigs[tab] || [];
  };

  const renderTabContent = () => {
    if (activeTab === 'info') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Clave</h3>
            <p className="font-mono text-[var(--app-ink)] mt-1">{programa?.clave}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Nombre</h3>
            <p className="font-semibold text-[var(--app-ink)] mt-1">{programa?.nombre}</p>
          </div>
          <div className="sm:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Descripción</h3>
            <p className="text-[var(--app-ink)] mt-1">{programa?.descripcion || 'Sin descripción'}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)] mb-1">Se entrega por etapas</h3>
            <Badge variant={programa?.tiene_etapas ? 'default' : 'secondary'}>
              {programa?.tiene_etapas ? 'Sí' : 'No'}
            </Badge>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)] mb-1">Requiere equipo</h3>
            <Badge variant={programa?.tiene_equipo ? 'default' : 'secondary'}>
              {programa?.tiene_equipo ? 'Sí' : 'No'}
            </Badge>
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
          <Button onClick={() => handleOpenCreate(activeTab)}>
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-14">
            <Inbox className="mx-auto h-10 w-10 mb-3 text-[var(--app-ink-2)]" aria-hidden="true" />
            <p className="font-semibold text-[var(--app-ink)]">Sin registros todavía</p>
            <p className="text-sm text-[var(--app-ink-2)]">Usa «Agregar» para crear el primero.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {activeTab === 'campos' && (
                  <>
                    <TableHead>Pregunta</TableHead>
                    <TableHead>Tipo de respuesta</TableHead>
                    <TableHead>Obligatoria</TableHead>
                    <TableHead>Posición</TableHead>
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
                    <TableHead>Calificación máxima</TableHead>
                    <TableHead>Peso</TableHead>
                  </>
                )}
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  {activeTab === 'campos' && (
                    <>
                      <TableCell className="font-medium">{item.etiqueta || item.nombre_campo}</TableCell>
                      <TableCell><Badge variant="outline">{TIPO_CAMPO_LABELS[item.tipo_campo] ?? item.tipo_campo}</Badge></TableCell>
                      <TableCell>{item.requerido ? <Check className="w-4 h-4" style={{ color: 'var(--tile-emerald-fg)' }} aria-label="Obligatoria" /> : '—'}</TableCell>
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
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button variant="soft" size="icon-sm" onClick={() => handleOpenEdit(activeTab, item)} aria-label="Editar" title="Editar">
                        <Edit />
                      </Button>
                      <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(item.id)} aria-label="Eliminar" title="Eliminar">
                        <Trash2 />
                      </Button>
                    </div>
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--auth-vino)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <PageHeader
        backHref="/admin/programas"
        backLabel="Volver a programas"
        eyebrow="Programa"
        title={programa.nombre}
        description="Ajusta las preguntas, los conceptos de gasto, las etapas, las modalidades y los criterios de evaluación de este programa."
      />

      <Card>
        <CardHeader className="pb-0">
          <div className="flex gap-1 overflow-x-auto -mb-px" role="tablist" aria-label="Secciones del programa">
            {(['info', 'campos', 'rubros', 'etapas', 'modalidades', 'criterios'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'text-[var(--auth-vino)] border-[var(--auth-vino)]'
                    : 'text-[var(--app-ink-2)] border-transparent hover:text-[var(--app-ink)]'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {renderTabContent()}
        </CardContent>
      </Card>

      <NestedCRUDModal
        isOpen={showModal}
        title={modalType === 'create' ? TAB_TITLES[activeTab].create : TAB_TITLES[activeTab].edit}
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
