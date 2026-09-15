'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StepFrame from '@/components/ui/step-frame';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import ConvocatoriaPreviewPanel from '@/components/admin/ConvocatoriaPreviewPanel';

interface Campo {
  nombre_campo: string;
  etiqueta: string;
  tipo_campo: 'text' | 'number' | 'date' | 'select' | 'textarea';
  requerido: boolean;
  orden: number;
  opciones_json?: string;
}

interface Documento {
  clave: string;
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  orden: number;
}

interface Rubro {
  clave: string;
  nombre: string;
  descripcion: string;
  porcentaje_maximo: number;
}

interface Criterio {
  nombre: string;
  descripcion: string;
  ponderacion: number;
  puntaje_maximo: number;
  orden: number;
}

interface WizardState {
  convocatoria: {
    nombre: string;
    ejercicio_fiscal: string;
    estado: 'borrador' | 'activa' | 'cerrada';
    descripcion: string;
    fecha_apertura: string;
    fecha_cierre: string;
    monto_maximo_apoyo: number;
    porcentaje_aportacion_minima: number;
  };
  programa: {
    clave: string;
    nombre: string;
    tipo_apoyo: 'reembolso' | 'concurrente' | 'honorarios';
    monto_maximo: number;
    tiene_etapas: boolean;
    num_etapas: number;
    tiene_equipo: boolean;
    min_miembros_equipo: number;
    max_miembros_equipo: number;
    requiere_evaluacion_tecnica: boolean;
    puntaje_minimo_aprobatorio: number;
  };
  campos: Campo[];
  documentos: Documento[];
  rubros: Rubro[];
  criterios: Criterio[];
}

const wizLabelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const wizInputCls = 'auth-input auth-input-static pl-4';

// Identificador interno a partir del texto visible: "Título del proyecto" → "titulo_del_proyecto"
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

const emptyWizardState: WizardState = {
  convocatoria: {
    nombre: '',
    ejercicio_fiscal: new Date().getFullYear().toString(),
    estado: 'borrador',
    descripcion: '',
    fecha_apertura: '',
    fecha_cierre: '',
    monto_maximo_apoyo: 0,
    porcentaje_aportacion_minima: 20,
  },
  programa: {
    clave: '',
    nombre: '',
    tipo_apoyo: 'concurrente',
    monto_maximo: 50000,
    tiene_etapas: false,
    num_etapas: 1,
    tiene_equipo: false,
    min_miembros_equipo: 1,
    max_miembros_equipo: 5,
    requiere_evaluacion_tecnica: true,
    puntaje_minimo_aprobatorio: 80,
  },
  campos: [],
  documentos: [],
  rubros: [],
  criterios: [],
};

export default function ConvocatoriasNuevaPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(emptyWizardState);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  const [inlineAlert, setInlineAlert] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, action: () => void, title: string, description: string}>({open: false, action: () => {}, title: '', description: ''});
  const [showCampoModal, setShowCampoModal] = useState(false);
  const [showDocumentoModal, setShowDocumentoModal] = useState(false);
  const [showRubroModal, setShowRubroModal] = useState(false);
  const [showCriterioModal, setShowCriterioModal] = useState(false);
  const [editCampoIdx, setEditCampoIdx] = useState<number | null>(null);
  const [editDocumentoIdx, setEditDocumentoIdx] = useState<number | null>(null);
  const [editRubroIdx, setEditRubroIdx] = useState<number | null>(null);
  const [editCriterioIdx, setEditCriterioIdx] = useState<number | null>(null);

  const [campoForm, setCampoForm] = useState<Campo>({
    nombre_campo: '',
    etiqueta: '',
    tipo_campo: 'text',
    requerido: false,
    orden: 1,
    opciones_json: '',
  });

  const [documentoForm, setDocumentoForm] = useState<Documento>({
    clave: '',
    nombre: '',
    descripcion: '',
    obligatorio: false,
    orden: 1,
  });

  const [rubroForm, setRubroForm] = useState<Rubro>({
    clave: '',
    nombre: '',
    descripcion: '',
    porcentaje_maximo: 25,
  });

  const [criterioForm, setCriterioForm] = useState<Criterio>({
    nombre: '',
    descripcion: '',
    ponderacion: 25,
    puntaje_maximo: 100,
    orden: 1,
  });

  const validateStep = useCallback((step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!state.convocatoria.nombre.trim()) errors.nombre = 'Nombre requerido';
      if (!state.convocatoria.ejercicio_fiscal.trim()) errors.ejercicio_fiscal = 'Ejercicio fiscal requerido';
      if (!state.convocatoria.fecha_apertura) errors.fecha_apertura = 'Fecha de apertura requerida';
      if (!state.convocatoria.fecha_cierre) errors.fecha_cierre = 'Fecha de cierre requerida';
      if (state.convocatoria.fecha_apertura > state.convocatoria.fecha_cierre) {
        errors.fecha_apertura = 'Apertura no puede ser después de cierre';
      }
      if (state.convocatoria.monto_maximo_apoyo <= 0) errors.monto_maximo_apoyo = 'Monto debe ser > 0';
      if (state.convocatoria.porcentaje_aportacion_minima < 0 || state.convocatoria.porcentaje_aportacion_minima > 100) {
        errors.porcentaje_aportacion_minima = 'Porcentaje debe estar entre 0 y 100';
      }
    }

    if (step === 2) {
      if (!state.programa.clave.trim()) errors.clave = 'Clave requerida';
      if (!state.programa.nombre.trim()) errors.nombre = 'Nombre requerido';
      if (state.programa.monto_maximo <= 0) errors.monto_maximo = 'Monto debe ser > 0';
      if (state.programa.tiene_etapas && state.programa.num_etapas < 1) {
        errors.num_etapas = 'Número de etapas debe ser > 0';
      }
      if (state.programa.puntaje_minimo_aprobatorio < 0 || state.programa.puntaje_minimo_aprobatorio > 100) {
        errors.puntaje_minimo = 'Puntaje debe estar entre 0 y 100';
      }
    }

    if (step === 3) {
      if (state.campos.length === 0) errors.campos = 'Agrega al menos un campo';
    }

    if (step === 4) {
      if (state.documentos.length === 0) errors.documentos = 'Agrega al menos un documento';
    }

    if (step === 5) {
      if (state.rubros.length === 0) errors.rubros = 'Agrega al menos un rubro';
    }

    if (step === 6) {
      if (state.criterios.length === 0) errors.criterios = 'Agrega al menos un criterio';
      const totalPonderacion = state.criterios.reduce((sum, c) => sum + c.ponderacion, 0);
      if (totalPonderacion !== 100) {
        errors.ponderacion = `La suma de ponderaciones debe ser 100 (actual: ${totalPonderacion})`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [state]);

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const openCampoModal = (idx?: number) => {
    if (idx !== undefined) {
      setEditCampoIdx(idx);
      setCampoForm(state.campos[idx]);
    } else {
      setEditCampoIdx(null);
      setCampoForm({
        nombre_campo: '',
        etiqueta: '',
        tipo_campo: 'text',
        requerido: false,
        orden: state.campos.length + 1,
        opciones_json: '',
      });
    }
    setShowCampoModal(true);
  };

  const saveCampo = () => {
    if (!campoForm.nombre_campo.trim() || !campoForm.etiqueta.trim()) {
      setInlineAlert({ type: 'error', message: 'Nombre y etiqueta son requeridos' });
      return;
    }
    if (campoForm.tipo_campo === 'select' && !campoForm.opciones_json?.trim()) {
      setInlineAlert({ type: 'error', message: 'Debes agregar al menos una opción para campos select' });
      return;
    }

    const newCampos = [...state.campos];
    if (editCampoIdx !== null) {
      newCampos[editCampoIdx] = campoForm;
    } else {
      newCampos.push(campoForm);
    }
    setState({ ...state, campos: newCampos });
    setShowCampoModal(false);
  };

  const deleteCampo = (idx: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar campo',
      description: '¿Eliminar este campo?',
      action: () => setState({ ...state, campos: state.campos.filter((_, i) => i !== idx) }),
    });
  };

  const openDocumentoModal = (idx?: number) => {
    if (idx !== undefined) {
      setEditDocumentoIdx(idx);
      setDocumentoForm(state.documentos[idx]);
    } else {
      setEditDocumentoIdx(null);
      setDocumentoForm({
        clave: '',
        nombre: '',
        descripcion: '',
        obligatorio: false,
        orden: state.documentos.length + 1,
      });
    }
    setShowDocumentoModal(true);
  };

  const saveDocumento = () => {
    if (!documentoForm.clave.trim() || !documentoForm.nombre.trim()) {
      setInlineAlert({ type: 'error', message: 'Clave y nombre son requeridos' });
      return;
    }
    const newDocumentos = [...state.documentos];
    if (editDocumentoIdx !== null) {
      newDocumentos[editDocumentoIdx] = documentoForm;
    } else {
      newDocumentos.push(documentoForm);
    }
    setState({ ...state, documentos: newDocumentos });
    setShowDocumentoModal(false);
  };

  const deleteDocumento = (idx: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar documento',
      description: '¿Eliminar este documento?',
      action: () => setState({ ...state, documentos: state.documentos.filter((_, i) => i !== idx) }),
    });
  };

  const openRubroModal = (idx?: number) => {
    if (idx !== undefined) {
      setEditRubroIdx(idx);
      setRubroForm(state.rubros[idx]);
    } else {
      setEditRubroIdx(null);
      setRubroForm({
        clave: '',
        nombre: '',
        descripcion: '',
        porcentaje_maximo: 25,
      });
    }
    setShowRubroModal(true);
  };

  const saveRubro = () => {
    if (!rubroForm.clave.trim() || !rubroForm.nombre.trim()) {
      setInlineAlert({ type: 'error', message: 'Clave y nombre son requeridos' });
      return;
    }
    const newRubros = [...state.rubros];
    if (editRubroIdx !== null) {
      newRubros[editRubroIdx] = rubroForm;
    } else {
      newRubros.push(rubroForm);
    }
    setState({ ...state, rubros: newRubros });
    setShowRubroModal(false);
  };

  const deleteRubro = (idx: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar rubro',
      description: '¿Eliminar este rubro?',
      action: () => setState({ ...state, rubros: state.rubros.filter((_, i) => i !== idx) }),
    });
  };

  const openCriterioModal = (idx?: number) => {
    if (idx !== undefined) {
      setEditCriterioIdx(idx);
      setCriterioForm(state.criterios[idx]);
    } else {
      setEditCriterioIdx(null);
      setCriterioForm({
        nombre: '',
        descripcion: '',
        ponderacion: 25,
        puntaje_maximo: 100,
        orden: state.criterios.length + 1,
      });
    }
    setShowCriterioModal(true);
  };

  const saveCriterio = () => {
    if (!criterioForm.nombre.trim()) {
      setInlineAlert({ type: 'error', message: 'Nombre del criterio es requerido' });
      return;
    }
    const newCriterios = [...state.criterios];
    if (editCriterioIdx !== null) {
      newCriterios[editCriterioIdx] = criterioForm;
    } else {
      newCriterios.push(criterioForm);
    }
    setState({ ...state, criterios: newCriterios });
    setShowCriterioModal(false);
  };

  const deleteCriterio = (idx: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar criterio',
      description: '¿Eliminar este criterio?',
      action: () => setState({ ...state, criterios: state.criterios.filter((_, i) => i !== idx) }),
    });
  };

  const handleSaveConvocatoria = async () => {
    if (!validateStep(7)) return;

    setSaving(true);
    setSaveError('');

    try {
      setSaveProgress('Creando programa...');
      const programaRes = await api.post('/admin/programas', {
        clave: state.programa.clave,
        nombre: state.programa.nombre,
        tipo_apoyo: state.programa.tipo_apoyo,
        monto_maximo: state.programa.monto_maximo,
        tiene_etapas: state.programa.tiene_etapas,
        num_etapas: state.programa.num_etapas,
        tiene_equipo: state.programa.tiene_equipo,
        min_miembros_equipo: state.programa.min_miembros_equipo,
        max_miembros_equipo: state.programa.max_miembros_equipo,
        requiere_evaluacion_tecnica: state.programa.requiere_evaluacion_tecnica,
        puntaje_minimo_aprobatorio: state.programa.puntaje_minimo_aprobatorio,
        activo: true,
      });

      const programaId = programaRes.data.id || programaRes.data.data?.id;

      if (state.campos.length > 0) {
        setSaveProgress('Agregando campos...');
        for (const campo of state.campos) {
          await api.post(`/admin/programas/${programaId}/campos`, {
            ...campo,
            programa_id: programaId,
          });
        }
      }

      if (state.documentos.length > 0) {
        setSaveProgress('Agregando documentos...');
        for (const doc of state.documentos) {
          await api.post(`/admin/programas/${programaId}/documentos`, {
            ...doc,
            programa_id: programaId,
          });
        }
      }

      if (state.rubros.length > 0) {
        setSaveProgress('Agregando rubros...');
        for (const rubro of state.rubros) {
          await api.post(`/admin/programas/${programaId}/rubros`, {
            ...rubro,
            programa_id: programaId,
          });
        }
      }

      if (state.criterios.length > 0) {
        setSaveProgress('Agregando criterios...');
        for (const criterio of state.criterios) {
          await api.post(`/admin/programas/${programaId}/criterios`, {
            ...criterio,
            programa_id: programaId,
          });
        }
      }

      setSaveProgress('Creando convocatoria...');
      await api.post('/admin/convocatorias', {
        nombre: state.convocatoria.nombre,
        ejercicio_fiscal: state.convocatoria.ejercicio_fiscal,
        estado: 'activa',
        descripcion: state.convocatoria.descripcion,
        fecha_apertura: state.convocatoria.fecha_apertura,
        fecha_cierre: state.convocatoria.fecha_cierre,
        monto_maximo_apoyo: state.convocatoria.monto_maximo_apoyo,
        porcentaje_aportacion_minima: state.convocatoria.porcentaje_aportacion_minima,
        tipo_programa_id: programaId,
      });

      setSaveProgress('¡Convocatoria creada exitosamente!');
      setTimeout(() => {
        router.push('/admin/convocatorias');
      }, 1500);
    } catch (error: any) {
      console.error('Error:', error);
      setSaveError(
        error.response?.data?.message ||
        error.message ||
        'Error al guardar la convocatoria'
      );
      setSaving(false);
    }
  };

  const totalPonderacion = state.criterios.reduce((sum, c) => sum + c.ponderacion, 0);

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {inlineAlert && <AlertBox type={inlineAlert.type} message={inlineAlert.message} onClose={() => setInlineAlert(null)} />}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.action(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="destructive"
      />

      {/* Layout split: wizard a la izquierda, preview en vivo a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">
        {/* Columna izquierda: wizard */}
        <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold text-neutral-dark">Nueva Convocatoria</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Wizard de 7 pasos para crear una convocatoria completa con programa, campos, documentos, rubros y criterios.</p>
      </div>

      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((step) => (
          <div key={step} className="flex items-center gap-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                currentStep === step
                  ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                  : currentStep > step
                  ? 'bg-green-100 text-green-700'
                  : 'bg-neutral-200 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
            </div>
            {step < 7 && <div className="w-2 h-1 bg-neutral-200" />}
          </div>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-xl text-primary">
            {currentStep === 1 && 'Información de la Convocatoria'}
            {currentStep === 2 && 'Configuración del Programa'}
            {currentStep === 3 && 'Campos del Formulario'}
            {currentStep === 4 && 'Documentos Requeridos'}
            {currentStep === 5 && 'Rubros Presupuestarios'}
            {currentStep === 6 && 'Criterios de Evaluación'}
            {currentStep === 7 && 'Revisión y Guardar'}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Completa la información general de la convocatoria'}
            {currentStep === 2 && 'Configura los parámetros del programa'}
            {currentStep === 3 && 'Define los campos dinámicos del formulario que verá el solicitante'}
            {currentStep === 4 && 'Especifica qué documentos debe proporcionar el solicitante'}
            {currentStep === 5 && 'Define los rubros presupuestarios permitidos'}
            {currentStep === 6 && 'Especifica los criterios de evaluación técnica'}
            {currentStep === 7 && 'Verifica toda la información antes de crear la convocatoria'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              {validationErrors.nombre && (
                <AlertBox type="error" message={validationErrors.nombre} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conv_nombre" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Nombre de la Convocatoria *
                  </Label>
                  <Input
                    id="conv_nombre"
                    value={state.convocatoria.nombre}
                    onChange={(e) =>
                      setState({
                        ...state,
                        convocatoria: { ...state.convocatoria, nombre: e.target.value },
                      })
                    }
                    placeholder="ej. Convocatoria 2026 - PROT"
                    className="mt-1"
                  />
                  {validationErrors.nombre && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.nombre}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="ejercicio_fiscal" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Ejercicio Fiscal *
                  </Label>
                  <Input
                    id="ejercicio_fiscal"
                    value={state.convocatoria.ejercicio_fiscal}
                    onChange={(e) =>
                      setState({
                        ...state,
                        convocatoria: { ...state.convocatoria, ejercicio_fiscal: e.target.value },
                      })
                    }
                    placeholder="2026"
                    className="mt-1"
                  />
                  {validationErrors.ejercicio_fiscal && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.ejercicio_fiscal}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="conv_descripcion" className="text-neutral-700 dark:text-neutral-200 font-medium">
                  Descripción
                </Label>
                <Textarea
                  id="conv_descripcion"
                  value={state.convocatoria.descripcion}
                  onChange={(e) =>
                    setState({
                      ...state,
                      convocatoria: { ...state.convocatoria, descripcion: e.target.value },
                    })
                  }
                  placeholder="Descripción detallada de la convocatoria"
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_apertura" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Fecha de Apertura *
                  </Label>
                  <Input
                    id="fecha_apertura"
                    type="date"
                    value={state.convocatoria.fecha_apertura}
                    onChange={(e) =>
                      setState({
                        ...state,
                        convocatoria: { ...state.convocatoria, fecha_apertura: e.target.value },
                      })
                    }
                    className="mt-1"
                  />
                  {validationErrors.fecha_apertura && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.fecha_apertura}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fecha_cierre" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Fecha de Cierre *
                  </Label>
                  <Input
                    id="fecha_cierre"
                    type="date"
                    value={state.convocatoria.fecha_cierre}
                    onChange={(e) =>
                      setState({
                        ...state,
                        convocatoria: { ...state.convocatoria, fecha_cierre: e.target.value },
                      })
                    }
                    className="mt-1"
                  />
                  {validationErrors.fecha_cierre && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.fecha_cierre}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monto_maximo" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Monto Máximo de Apoyo *
                  </Label>
                  <Input
                    id="monto_maximo"
                    type="number"
                    value={state.convocatoria.monto_maximo_apoyo}
                    onChange={(e) =>
                      setState({
                        ...state,
                        convocatoria: {
                          ...state.convocatoria,
                          monto_maximo_apoyo: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="mt-1"
                  />
                  {validationErrors.monto_maximo_apoyo && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.monto_maximo_apoyo}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="porcentaje_aportacion" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Porcentaje Aportación Concurrente (%)
                  </Label>
                  <Input
                    id="porcentaje_aportacion"
                    type="number"
                    value={state.convocatoria.porcentaje_aportacion_minima}
                    onChange={(e) =>
                      setState({
                        ...state,
                        convocatoria: {
                          ...state.convocatoria,
                          porcentaje_aportacion_minima: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                    max="100"
                    className="mt-1"
                  />
                  {validationErrors.porcentaje_aportacion_minima && (
                    <p className="text-red-600 text-sm mt-1">
                      {validationErrors.porcentaje_aportacion_minima}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {validationErrors.clave && (
                <AlertBox type="error" message={validationErrors.clave} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prog_clave" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Clave del Programa *
                  </Label>
                  <Input
                    id="prog_clave"
                    value={state.programa.clave}
                    onChange={(e) =>
                      setState({
                        ...state,
                        programa: { ...state.programa, clave: e.target.value.toUpperCase() },
                      })
                    }
                    placeholder="ej. PROT, IPFE, VINC"
                    className="mt-1"
                  />
                  {validationErrors.clave && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.clave}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="prog_nombre" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Nombre del Programa *
                  </Label>
                  <Input
                    id="prog_nombre"
                    value={state.programa.nombre}
                    onChange={(e) =>
                      setState({
                        ...state,
                        programa: { ...state.programa, nombre: e.target.value },
                      })
                    }
                    placeholder="ej. Prototipos de Tecnología"
                    className="mt-1"
                  />
                  {validationErrors.nombre && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.nombre}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_apoyo" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Tipo de Apoyo *
                  </Label>
                  <Select
                    value={state.programa.tipo_apoyo}
                    onValueChange={(v: any) =>
                      setState({
                        ...state,
                        programa: { ...state.programa, tipo_apoyo: v },
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reembolso">Reembolso</SelectItem>
                      <SelectItem value="concurrente">Concurrente</SelectItem>
                      <SelectItem value="honorarios">Honorarios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="monto_max_prog" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Monto Máximo del Programa *
                  </Label>
                  <Input
                    id="monto_max_prog"
                    type="number"
                    value={state.programa.monto_maximo}
                    onChange={(e) =>
                      setState({
                        ...state,
                        programa: {
                          ...state.programa,
                          monto_maximo: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="mt-1"
                  />
                  {validationErrors.monto_maximo && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.monto_maximo}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Configuración Avanzada</h3>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="tiene_etapas"
                    checked={state.programa.tiene_etapas}
                    onCheckedChange={(v) =>
                      setState({
                        ...state,
                        programa: { ...state.programa, tiene_etapas: v as boolean },
                      })
                    }
                  />
                  <Label htmlFor="tiene_etapas" className="text-neutral-700 dark:text-neutral-200 cursor-pointer">
                    Este programa tiene etapas
                  </Label>
                  {state.programa.tiene_etapas && (
                    <Input
                      type="number"
                      value={state.programa.num_etapas}
                      onChange={(e) =>
                        setState({
                          ...state,
                          programa: {
                            ...state.programa,
                            num_etapas: parseInt(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-20 ml-auto"
                      min="1"
                      max="10"
                    />
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="tiene_equipo"
                    checked={state.programa.tiene_equipo}
                    onCheckedChange={(v) =>
                      setState({
                        ...state,
                        programa: { ...state.programa, tiene_equipo: v as boolean },
                      })
                    }
                  />
                  <Label htmlFor="tiene_equipo" className="text-neutral-700 dark:text-neutral-200 cursor-pointer">
                    Requiere equipo de trabajo
                  </Label>
                  {state.programa.tiene_equipo && (
                    <div className="ml-auto flex gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-600 dark:text-neutral-300">Min:</span>
                        <Input
                          type="number"
                          value={state.programa.min_miembros_equipo}
                          onChange={(e) =>
                            setState({
                              ...state,
                              programa: {
                                ...state.programa,
                                min_miembros_equipo: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-16"
                          min="1"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-600 dark:text-neutral-300">Máx:</span>
                        <Input
                          type="number"
                          value={state.programa.max_miembros_equipo}
                          onChange={(e) =>
                            setState({
                              ...state,
                              programa: {
                                ...state.programa,
                                max_miembros_equipo: parseInt(e.target.value) || 5,
                              },
                            })
                          }
                          className="w-16"
                          min="1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="requiere_evaluacion"
                    checked={state.programa.requiere_evaluacion_tecnica}
                    onCheckedChange={(v) =>
                      setState({
                        ...state,
                        programa: {
                          ...state.programa,
                          requiere_evaluacion_tecnica: v as boolean,
                        },
                      })
                    }
                  />
                  <Label htmlFor="requiere_evaluacion" className="text-neutral-700 dark:text-neutral-200 cursor-pointer">
                    Requiere evaluación técnica
                  </Label>
                </div>

                <div>
                  <Label htmlFor="puntaje_minimo" className="text-neutral-700 dark:text-neutral-200 font-medium">
                    Puntaje Mínimo Aprobatorio
                  </Label>
                  <Input
                    id="puntaje_minimo"
                    type="number"
                    value={state.programa.puntaje_minimo_aprobatorio}
                    onChange={(e) =>
                      setState({
                        ...state,
                        programa: {
                          ...state.programa,
                          puntaje_minimo_aprobatorio: parseInt(e.target.value) || 80,
                        },
                      })
                    }
                    min="0"
                    max="100"
                    className="mt-1"
                  />
                  {validationErrors.puntaje_minimo && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.puntaje_minimo}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              {validationErrors.campos && (
                <AlertBox type="error" message={validationErrors.campos} />
              )}

              <Button
                onClick={() => openCampoModal()}
                className="bg-primary hover:bg-primary-light text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Agregar Campo
              </Button>

              {state.campos.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <p>No hay campos agregados. Agrega al menos uno.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-primary font-semibold">Campo</TableHead>
                      <TableHead className="text-primary font-semibold">Etiqueta</TableHead>
                      <TableHead className="text-primary font-semibold">Tipo</TableHead>
                      <TableHead className="text-primary font-semibold">Requerido</TableHead>
                      <TableHead className="text-primary font-semibold">Orden</TableHead>
                      <TableHead className="text-right text-primary font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.campos.map((campo, idx) => (
                      <TableRow key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <TableCell className="font-mono text-sm">{campo.nombre_campo}</TableCell>
                        <TableCell>{campo.etiqueta}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campo.tipo_campo}</Badge>
                        </TableCell>
                        <TableCell>
                          {campo.requerido ? <Badge className="bg-green-100 text-green-700">Sí</Badge> : <Badge variant="secondary">No</Badge>}
                        </TableCell>
                        <TableCell>{campo.orden}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCampoModal(idx)}
                            className="text-neutral-600 dark:text-neutral-300 hover:text-primary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteCampo(idx)}
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

              <StepFrame
                open={showCampoModal}
                size="md"
                title={editCampoIdx !== null ? 'Editar pregunta' : 'Nueva pregunta del formulario'}
                icon={<Plus className="h-5 w-5" />}
                intro={<>Cada pregunta aparece en el formulario que llena el solicitante. Escribe el texto <strong>tal como quieres que lo lea</strong>.</>}
                onClose={() => setShowCampoModal(false)}
                onSubmit={saveCampo}
                submitLabel={editCampoIdx !== null ? 'Guardar cambios' : 'Agregar pregunta'}
                steps={[
                  {
                    key: 'texto',
                    label: 'La pregunta',
                    question: '¿Qué le vas a preguntar al solicitante?',
                    validate: () => (!campoForm.etiqueta.trim() ? 'Escribe el texto de la pregunta.' : null),
                    content: (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="campo_etiqueta" className={wizLabelCls}>Texto de la pregunta *</Label>
                          <input
                            id="campo_etiqueta"
                            value={campoForm.etiqueta}
                            onChange={(e) => {
                              const etiqueta = e.target.value;
                              setCampoForm({ ...campoForm, etiqueta, nombre_campo: editCampoIdx !== null ? campoForm.nombre_campo : slugify(etiqueta) });
                            }}
                            placeholder="Ej. Título del proyecto"
                            className={wizInputCls}
                          />
                          <p className="text-xs text-[var(--app-ink-2)]">Identificador interno: <code className="font-mono">{campoForm.nombre_campo || '—'}</code></p>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'tipo',
                    label: 'Cómo responde',
                    question: '¿Qué tipo de respuesta esperas?',
                    validate: () => (campoForm.tipo_campo === 'select' && !campoForm.opciones_json?.trim() ? 'Escribe al menos una opción para elegir.' : null),
                    content: (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="campo_tipo" className={wizLabelCls}>Tipo de respuesta *</Label>
                          <select
                            id="campo_tipo"
                            value={campoForm.tipo_campo}
                            onChange={(e) => setCampoForm({ ...campoForm, tipo_campo: e.target.value as Campo['tipo_campo'] })}
                            className={wizInputCls}
                          >
                            <option value="text">Texto corto</option>
                            <option value="textarea">Texto largo (párrafos)</option>
                            <option value="number">Un número</option>
                            <option value="date">Una fecha</option>
                            <option value="select">Elegir de una lista</option>
                          </select>
                        </div>
                        {campoForm.tipo_campo === 'select' && (
                          <div className="space-y-1.5">
                            <Label htmlFor="campo_opciones" className={wizLabelCls}>Opciones (una por línea) *</Label>
                            <textarea
                              id="campo_opciones"
                              value={campoForm.opciones_json}
                              onChange={(e) => setCampoForm({ ...campoForm, opciones_json: e.target.value })}
                              placeholder={'Opción 1\nOpción 2\nOpción 3'}
                              className={`${wizInputCls} !h-auto min-h-[110px] py-3 resize-y`}
                            />
                          </div>
                        )}
                        <label className="flex items-center gap-3 rounded-[14px] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', backgroundColor: campoForm.requerido ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
                          <Checkbox id="campo_requerido" checked={campoForm.requerido} onCheckedChange={(v) => setCampoForm({ ...campoForm, requerido: v as boolean })} />
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-[var(--app-ink)]">Es obligatoria</span>
                            <span className="block text-xs text-[var(--app-ink-2)]">El solicitante no podrá enviar sin responderla.</span>
                          </span>
                          <span className="flex items-center gap-2 text-xs text-[var(--app-ink-2)]">
                            Posición
                            <input type="number" aria-label="Posición en el formulario" value={campoForm.orden} onChange={(e) => setCampoForm({ ...campoForm, orden: parseInt(e.target.value) || 1 })} min={1} className={`${wizInputCls} pl-3 !w-20 !min-h-10 !h-10`} />
                          </span>
                        </label>
                      </>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              {validationErrors.documentos && (
                <AlertBox type="error" message={validationErrors.documentos} />
              )}

              <Button
                onClick={() => openDocumentoModal()}
                className="bg-primary hover:bg-primary-light text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Agregar Documento
              </Button>

              {state.documentos.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <p>No hay documentos agregados. Agrega al menos uno.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-primary font-semibold">Clave</TableHead>
                      <TableHead className="text-primary font-semibold">Nombre</TableHead>
                      <TableHead className="text-primary font-semibold">Obligatorio</TableHead>
                      <TableHead className="text-primary font-semibold">Orden</TableHead>
                      <TableHead className="text-right text-primary font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.documentos.map((doc, idx) => (
                      <TableRow key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <TableCell className="font-mono text-sm">{doc.clave}</TableCell>
                        <TableCell>{doc.nombre}</TableCell>
                        <TableCell>
                          {doc.obligatorio ? <Badge className="bg-green-100 text-green-700">Sí</Badge> : <Badge variant="secondary">No</Badge>}
                        </TableCell>
                        <TableCell>{doc.orden}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDocumentoModal(idx)}
                            className="text-neutral-600 dark:text-neutral-300 hover:text-primary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteDocumento(idx)}
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

              <StepFrame
                open={showDocumentoModal}
                size="md"
                title={editDocumentoIdx !== null ? 'Editar documento' : 'Nuevo documento a solicitar'}
                icon={<Plus className="h-5 w-5" />}
                intro={<>Es un archivo PDF que el solicitante deberá adjuntar. Ponle el <strong>nombre con el que lo conoce</strong> (por ejemplo, &ldquo;Carta de apoyo institucional&rdquo;).</>}
                onClose={() => setShowDocumentoModal(false)}
                onSubmit={saveDocumento}
                submitLabel={editDocumentoIdx !== null ? 'Guardar cambios' : 'Agregar documento'}
                steps={[
                  {
                    key: 'nombre',
                    label: 'Cuál es',
                    question: '¿Qué documento se pide?',
                    validate: () => (!documentoForm.nombre.trim() ? 'Escribe el nombre del documento.' : null),
                    content: (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="doc_nombre" className={wizLabelCls}>Nombre del documento *</Label>
                          <input
                            id="doc_nombre"
                            value={documentoForm.nombre}
                            onChange={(e) => {
                              const nombre = e.target.value;
                              setDocumentoForm({ ...documentoForm, nombre, clave: editDocumentoIdx !== null ? documentoForm.clave : slugify(nombre) });
                            }}
                            placeholder="Ej. Ficha técnica del proyecto"
                            className={wizInputCls}
                          />
                          <p className="text-xs text-[var(--app-ink-2)]">Identificador interno: <code className="font-mono">{documentoForm.clave || '—'}</code></p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="doc_descripcion" className={wizLabelCls}>Qué debe contener (opcional)</Label>
                          <textarea
                            id="doc_descripcion"
                            value={documentoForm.descripcion}
                            onChange={(e) => setDocumentoForm({ ...documentoForm, descripcion: e.target.value })}
                            placeholder="Una guía breve para quien lo va a preparar."
                            className={`${wizInputCls} !h-auto min-h-[90px] py-3 resize-y`}
                          />
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'reglas',
                    label: 'Reglas',
                    question: '¿Es obligatorio y en qué orden va?',
                    content: (
                      <label className="flex items-center gap-3 rounded-[14px] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', backgroundColor: documentoForm.obligatorio ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
                        <Checkbox id="doc_obligatorio" checked={documentoForm.obligatorio} onCheckedChange={(v) => setDocumentoForm({ ...documentoForm, obligatorio: v as boolean })} />
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-[var(--app-ink)]">Es obligatorio</span>
                          <span className="block text-xs text-[var(--app-ink-2)]">Sin él, la solicitud no se puede enviar.</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs text-[var(--app-ink-2)]">
                          Posición
                          <input type="number" aria-label="Posición en la lista" value={documentoForm.orden} onChange={(e) => setDocumentoForm({ ...documentoForm, orden: parseInt(e.target.value) || 1 })} min={1} className={`${wizInputCls} pl-3 !w-20 !min-h-10 !h-10`} />
                        </span>
                      </label>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              {validationErrors.rubros && (
                <AlertBox type="error" message={validationErrors.rubros} />
              )}

              <Button
                onClick={() => openRubroModal()}
                className="bg-primary hover:bg-primary-light text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Agregar Rubro
              </Button>

              {state.rubros.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <p>No hay rubros agregados. Agrega al menos uno.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-primary font-semibold">Clave</TableHead>
                      <TableHead className="text-primary font-semibold">Nombre</TableHead>
                      <TableHead className="text-primary font-semibold">Porcentaje Máx</TableHead>
                      <TableHead className="text-right text-primary font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.rubros.map((rubro, idx) => (
                      <TableRow key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <TableCell className="font-mono text-sm">{rubro.clave}</TableCell>
                        <TableCell>{rubro.nombre}</TableCell>
                        <TableCell>{rubro.porcentaje_maximo}%</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRubroModal(idx)}
                            className="text-neutral-600 dark:text-neutral-300 hover:text-primary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRubro(idx)}
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

              <StepFrame
                open={showRubroModal}
                size="md"
                title={editRubroIdx !== null ? 'Editar concepto de gasto' : 'Nuevo concepto de gasto'}
                icon={<Plus className="h-5 w-5" />}
                intro={<>Un concepto de gasto es <strong>en qué se puede usar el dinero</strong> (personal, equipo, viajes…). El solicitante reparte su presupuesto entre estos conceptos.</>}
                onClose={() => setShowRubroModal(false)}
                onSubmit={saveRubro}
                submitLabel={editRubroIdx !== null ? 'Guardar cambios' : 'Agregar concepto'}
                steps={[
                  {
                    key: 'nombre',
                    label: 'Cuál es',
                    question: '¿En qué se puede gastar?',
                    validate: () => (!rubroForm.nombre.trim() ? 'Escribe el nombre del concepto.' : null),
                    content: (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="rubro_nombre" className={wizLabelCls}>Nombre del concepto *</Label>
                          <input
                            id="rubro_nombre"
                            value={rubroForm.nombre}
                            onChange={(e) => {
                              const nombre = e.target.value;
                              setRubroForm({ ...rubroForm, nombre, clave: editRubroIdx !== null ? rubroForm.clave : slugify(nombre).toUpperCase() });
                            }}
                            placeholder="Ej. Equipo de cómputo"
                            className={wizInputCls}
                          />
                          <p className="text-xs text-[var(--app-ink-2)]">Identificador interno: <code className="font-mono">{rubroForm.clave || '—'}</code></p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="rubro_descripcion" className={wizLabelCls}>Qué incluye (opcional)</Label>
                          <textarea
                            id="rubro_descripcion"
                            value={rubroForm.descripcion}
                            onChange={(e) => setRubroForm({ ...rubroForm, descripcion: e.target.value })}
                            placeholder="Ej. Computadoras, licencias de software y periféricos."
                            className={`${wizInputCls} !h-auto min-h-[90px] py-3 resize-y`}
                          />
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'limite',
                    label: 'Límite',
                    question: '¿Qué parte del presupuesto puede irse aquí?',
                    validate: () => (rubroForm.porcentaje_maximo < 0 || rubroForm.porcentaje_maximo > 100 ? 'El porcentaje va de 0 a 100.' : null),
                    content: (
                      <div className="space-y-1.5">
                        <Label htmlFor="rubro_porcentaje" className={wizLabelCls}>Porcentaje máximo del total</Label>
                        <input
                          id="rubro_porcentaje"
                          type="number"
                          value={rubroForm.porcentaje_maximo}
                          onChange={(e) => setRubroForm({ ...rubroForm, porcentaje_maximo: parseFloat(e.target.value) || 0 })}
                          min={0}
                          max={100}
                          className={wizInputCls}
                        />
                        <p className="text-xs text-[var(--app-ink-2)]">Ejemplo: con 25 %, de un apoyo de $100,000 podrán destinar hasta $25,000 a este concepto.</p>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              {validationErrors.criterios && (
                <AlertBox type="error" message={validationErrors.criterios} />
              )}
              {validationErrors.ponderacion && (
                <AlertBox type="warning" message={validationErrors.ponderacion} />
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Ponderación Total:</strong> {totalPonderacion}%{' '}
                  {totalPonderacion === 100
                    ? <CheckCircle className="inline w-4 h-4 text-emerald-600 align-text-bottom" aria-label="Correcto" />
                    : <XCircle className="inline w-4 h-4 text-red-500 align-text-bottom" aria-label="Debe sumar 100" />}
                </p>
              </div>

              <Button
                onClick={() => openCriterioModal()}
                className="bg-primary hover:bg-primary-light text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Agregar Criterio
              </Button>

              {state.criterios.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <p>No hay criterios agregados. Agrega al menos uno.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-primary font-semibold">Nombre</TableHead>
                      <TableHead className="text-primary font-semibold">Ponderación</TableHead>
                      <TableHead className="text-primary font-semibold">Puntaje Máx</TableHead>
                      <TableHead className="text-primary font-semibold">Orden</TableHead>
                      <TableHead className="text-right text-primary font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.criterios.map((criterio, idx) => (
                      <TableRow key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <TableCell className="font-medium">{criterio.nombre}</TableCell>
                        <TableCell>
                          <Badge variant={criterio.ponderacion > 0 ? 'default' : 'destructive'}>
                            {criterio.ponderacion}%
                          </Badge>
                        </TableCell>
                        <TableCell>{criterio.puntaje_maximo}</TableCell>
                        <TableCell>{criterio.orden}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCriterioModal(idx)}
                            className="text-neutral-600 dark:text-neutral-300 hover:text-primary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteCriterio(idx)}
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

              <StepFrame
                open={showCriterioModal}
                size="md"
                title={editCriterioIdx !== null ? 'Editar criterio' : 'Nuevo criterio de evaluación'}
                icon={<Plus className="h-5 w-5" />}
                intro={<>Los evaluadores califican cada proyecto criterio por criterio. Entre todos los criterios el <strong>peso debe sumar 100 %</strong> (ahora llevan {totalPonderacion} %).</>}
                onClose={() => setShowCriterioModal(false)}
                onSubmit={saveCriterio}
                submitLabel={editCriterioIdx !== null ? 'Guardar cambios' : 'Agregar criterio'}
                steps={[
                  {
                    key: 'nombre',
                    label: 'Qué se evalúa',
                    question: '¿Qué aspecto del proyecto se califica?',
                    validate: () => (!criterioForm.nombre.trim() ? 'Escribe el nombre del criterio.' : null),
                    content: (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="criterio_nombre" className={wizLabelCls}>Nombre del criterio *</Label>
                          <input
                            id="criterio_nombre"
                            value={criterioForm.nombre}
                            onChange={(e) => setCriterioForm({ ...criterioForm, nombre: e.target.value })}
                            placeholder="Ej. Viabilidad técnica"
                            className={wizInputCls}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="criterio_descripcion" className={wizLabelCls}>Qué debe considerar el evaluador (opcional)</Label>
                          <textarea
                            id="criterio_descripcion"
                            value={criterioForm.descripcion}
                            onChange={(e) => setCriterioForm({ ...criterioForm, descripcion: e.target.value })}
                            placeholder="Ej. Que la metodología sea realizable con los recursos y el tiempo propuestos."
                            className={`${wizInputCls} !h-auto min-h-[90px] py-3 resize-y`}
                          />
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'peso',
                    label: 'Cuánto pesa',
                    question: '¿Qué tanto cuenta en la calificación final?',
                    validate: () => (criterioForm.ponderacion <= 0 || criterioForm.ponderacion > 100 ? 'El peso va de 1 a 100.' : null),
                    content: (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="criterio_ponderacion" className={wizLabelCls}>Peso (%) *</Label>
                          <input
                            id="criterio_ponderacion"
                            type="number"
                            value={criterioForm.ponderacion}
                            onChange={(e) => setCriterioForm({ ...criterioForm, ponderacion: parseFloat(e.target.value) || 0 })}
                            min={0}
                            max={100}
                            className={wizInputCls}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="criterio_puntaje" className={wizLabelCls}>Calificación máxima</Label>
                          <input
                            id="criterio_puntaje"
                            type="number"
                            value={criterioForm.puntaje_maximo}
                            onChange={(e) => setCriterioForm({ ...criterioForm, puntaje_maximo: parseFloat(e.target.value) || 100 })}
                            min={0}
                            className={wizInputCls}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="criterio_orden" className={wizLabelCls}>Posición</Label>
                          <input
                            id="criterio_orden"
                            type="number"
                            value={criterioForm.orden}
                            onChange={(e) => setCriterioForm({ ...criterioForm, orden: parseInt(e.target.value) || 1 })}
                            min={1}
                            className={wizInputCls}
                          />
                        </div>
                        <p className="sm:col-span-3 text-xs text-[var(--app-ink-2)]">El evaluador califica de 0 a la calificación máxima; el sistema convierte esa nota al peso indicado.</p>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-6">
              {saveError && (
                <AlertBox type="error" title="Error al guardar" message={saveError} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Card className="border border-neutral-200 dark:border-neutral-700">
                  <CardHeader className="bg-neutral-50 dark:bg-neutral-900">
                    <CardTitle className="text-base">Convocatoria</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pt-4">
                    <p><strong>Nombre:</strong> {state.convocatoria.nombre}</p>
                    <p><strong>Ejercicio:</strong> {state.convocatoria.ejercicio_fiscal}</p>
                    <p><strong>Apertura:</strong> {state.convocatoria.fecha_apertura}</p>
                    <p><strong>Cierre:</strong> {state.convocatoria.fecha_cierre}</p>
                    <p><strong>Monto Máx:</strong> ${state.convocatoria.monto_maximo_apoyo.toLocaleString()}</p>
                    <p><strong>Aportación Concurrente:</strong> {state.convocatoria.porcentaje_aportacion_minima}%</p>
                  </CardContent>
                </Card>

                <Card className="border border-neutral-200 dark:border-neutral-700">
                  <CardHeader className="bg-neutral-50 dark:bg-neutral-900">
                    <CardTitle className="text-base">Programa</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pt-4">
                    <p><strong>Clave:</strong> {state.programa.clave}</p>
                    <p><strong>Nombre:</strong> {state.programa.nombre}</p>
                    <p><strong>Tipo Apoyo:</strong> {state.programa.tipo_apoyo}</p>
                    <p><strong>Monto Máx:</strong> ${state.programa.monto_maximo.toLocaleString()}</p>
                    <p><strong>Etapas:</strong> {state.programa.tiene_etapas ? `Sí (${state.programa.num_etapas})` : 'No'}</p>
                    <p><strong>Equipo:</strong> {state.programa.tiene_equipo ? `Sí (${state.programa.min_miembros_equipo}-${state.programa.max_miembros_equipo})` : 'No'}</p>
                    <p><strong>Puntaje Min:</strong> {state.programa.puntaje_minimo_aprobatorio}</p>
                  </CardContent>
                </Card>

                <Card className="border border-neutral-200 dark:border-neutral-700">
                  <CardHeader className="bg-neutral-50 dark:bg-neutral-900">
                    <CardTitle className="text-base">Campos ({state.campos.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1 pt-4">
                    {state.campos.map((c, i) => (
                      <p key={i} className="text-neutral-600 dark:text-neutral-300">• {c.etiqueta} <Badge variant="outline" className="ml-2">{c.tipo_campo}</Badge></p>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border border-neutral-200 dark:border-neutral-700">
                  <CardHeader className="bg-neutral-50 dark:bg-neutral-900">
                    <CardTitle className="text-base">Documentos ({state.documentos.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1 pt-4">
                    {state.documentos.map((d, i) => (
                      <p key={i} className="text-neutral-600 dark:text-neutral-300">• {d.nombre} {d.obligatorio && <Badge className="bg-green-100 text-green-700 ml-2">Obligatorio</Badge>}</p>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border border-neutral-200 dark:border-neutral-700">
                  <CardHeader className="bg-neutral-50 dark:bg-neutral-900">
                    <CardTitle className="text-base">Rubros ({state.rubros.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1 pt-4">
                    {state.rubros.map((r, i) => (
                      <p key={i} className="text-neutral-600 dark:text-neutral-300">• {r.nombre} <Badge variant="outline" className="ml-2">{r.porcentaje_maximo}%</Badge></p>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border border-neutral-200 dark:border-neutral-700">
                  <CardHeader className="bg-neutral-50 dark:bg-neutral-900">
                    <CardTitle className="text-base">Criterios ({state.criterios.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1 pt-4">
                    {state.criterios.map((cr, i) => (
                      <p key={i} className="text-neutral-600 dark:text-neutral-300">• {cr.nombre} <Badge variant="outline" className="ml-2">{cr.ponderacion}%</Badge></p>
                    ))}
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 border-t pt-2">Total: {totalPonderacion}%</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t border-neutral-100 dark:border-neutral-700 p-6 bg-white dark:bg-neutral-900 flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || saving}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
          </Button>

          {currentStep < 7 ? (
            <Button
              className="bg-primary hover:bg-primary-light text-white"
              onClick={handleNext}
              disabled={saving}
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSaveConvocatoria}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {saveProgress || 'Guardando...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Crear Convocatoria Completa
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
        </div>

        {/* Columna derecha: preview lateral en vivo */}
        <ConvocatoriaPreviewPanel
          convocatoria={state.convocatoria}
          programa={state.programa}
          campos={state.campos}
          documentos={state.documentos}
          rubros={state.rubros}
          criterios={state.criterios}
        />
      </div>
    </div>
  );
}
