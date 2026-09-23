'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import StepFrame from '@/components/ui/step-frame';
import PageHeader from '@/components/ui/page-header';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle,
  XCircle,
  Megaphone,
  Inbox,
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
const wizErrCls = 'text-xs font-medium';
const wizCheckCard = 'flex flex-wrap items-center gap-3 rounded-[14px] border px-4 py-3 cursor-pointer';

const TIPO_CAMPO_LABELS: Record<Campo['tipo_campo'], string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  select: 'Lista de opciones',
};

const TIPO_APOYO_LABELS: Record<WizardState['programa']['tipo_apoyo'], string> = {
  reembolso: 'Reembolso',
  concurrente: 'Concurrente',
  honorarios: 'Honorarios',
};

const WIZARD_STEPS = [
  'Convocatoria',
  'Programa',
  'Preguntas',
  'Documentos',
  'Conceptos de gasto',
  'Criterios',
  'Revisión',
];

const EmptyList = ({ text }: { text: string }) => (
  <div className="empty-state !py-10">
    <span className="tone-chip" data-tone="violet"><Inbox aria-hidden="true" /></span>
    <p className="font-bold text-[var(--app-ink)]">Sin registros todavía</p>
    <p className="text-sm text-[var(--app-ink-2)]">{text}</p>
  </div>
);

// Identificador interno a partir del texto visible: "Título del proyecto" → "titulo_del_proyecto"
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

// "Prototipos de tecnología" → "PROT": clave corta propuesta con la primera palabra significativa
const claveDesdeNombre = (nombre: string) => {
  const palabras = slugify(nombre).split('_').filter((w) => w.length > 2 && !['los', 'las', 'del', 'con', 'para', 'por', 'una', 'uno'].includes(w));
  return palabras.length ? palabras[0].slice(0, 4).toUpperCase() : '';
};

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
  const claveTouched = useRef(false);
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
      <PageHeader
        backHref="/admin/convocatorias"
        backLabel="Volver a convocatorias"
        eyebrow="Convocatorias"
        title="Nueva convocatoria"
        description="En siete pasos defines la convocatoria, su programa, las preguntas y documentos que pedirás, en qué se puede gastar el apoyo y cómo se evaluará."
        icon={<Megaphone className="h-5 w-5" />}
      />

      <ol className="flex items-center justify-center gap-1" aria-label={`Paso ${currentStep} de 7: ${WIZARD_STEPS[currentStep - 1]}`}>
        {WIZARD_STEPS.map((label, i) => {
          const step = i + 1;
          const done = currentStep > step;
          const active = currentStep === step;
          return (
            <li key={step} className="flex items-center gap-1">
              <span
                title={label}
                aria-current={active ? 'step' : undefined}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-[transform,background-color,color] duration-200 ${
                  active
                    ? 'bg-[var(--auth-vino)] text-white ring-4 ring-[var(--auth-vino-soft)] scale-105'
                    : done
                    ? 'text-[var(--tile-emerald-fg)]'
                    : 'bg-[var(--auth-field)] text-[var(--app-ink-2)]'
                }`}
                style={done ? { backgroundColor: 'var(--tile-emerald-bg)' } : undefined}
              >
                {done ? <CheckCircle className="w-5 h-5" aria-hidden="true" /> : step}
                <span className="sr-only">{label}</span>
              </span>
              {step < 7 && <span className="w-2 sm:w-3 h-0.5 bg-[var(--app-rule)]" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <p className="text-center text-xs font-bold uppercase tracking-[0.14em] -mt-3" style={{ color: 'var(--auth-vino)' }}>
        Paso {currentStep} de 7 · {WIZARD_STEPS[currentStep - 1]}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && 'Información de la convocatoria'}
            {currentStep === 2 && 'Configuración del programa'}
            {currentStep === 3 && 'Preguntas del formulario'}
            {currentStep === 4 && 'Documentos que se piden'}
            {currentStep === 5 && 'Conceptos de gasto'}
            {currentStep === 6 && 'Criterios de evaluación'}
            {currentStep === 7 && 'Revisa y guarda'}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Escribe los datos generales que verán los solicitantes.'}
            {currentStep === 2 && 'Define cómo se entrega el apoyo y qué reglas aplican.'}
            {currentStep === 3 && 'Estas son las preguntas que responderá el solicitante en su formulario.'}
            {currentStep === 4 && 'Indica qué archivos debe adjuntar el solicitante.'}
            {currentStep === 5 && 'Define en qué se puede usar el dinero del apoyo.'}
            {currentStep === 6 && 'Indica qué se califica y cuánto pesa cada aspecto.'}
            {currentStep === 7 && 'Revisa toda la información antes de crear la convocatoria.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conv_nombre" className={wizLabelCls}>Nombre de la convocatoria *</Label>
                  <input
                    id="conv_nombre"
                    value={state.convocatoria.nombre}
                    onChange={(e) => setState({ ...state, convocatoria: { ...state.convocatoria, nombre: e.target.value } })}
                    placeholder="Ej. Convocatoria 2026 · Prototipos de tecnología"
                    className={wizInputCls}
                    aria-invalid={validationErrors.nombre ? 'true' : undefined}
                  />
                  {validationErrors.nombre && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.nombre}</p>}
                  <p className="text-xs text-[var(--app-ink-2)]">Así la verán los solicitantes en la lista de convocatorias abiertas.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ejercicio_fiscal" className={wizLabelCls}>Ejercicio fiscal *</Label>
                  <input
                    id="ejercicio_fiscal"
                    inputMode="numeric"
                    maxLength={4}
                    value={state.convocatoria.ejercicio_fiscal}
                    onChange={(e) => setState({ ...state, convocatoria: { ...state.convocatoria, ejercicio_fiscal: e.target.value } })}
                    placeholder="2026"
                    className={wizInputCls}
                    aria-invalid={validationErrors.ejercicio_fiscal ? 'true' : undefined}
                  />
                  {validationErrors.ejercicio_fiscal && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.ejercicio_fiscal}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conv_descripcion" className={wizLabelCls}>Descripción (opcional)</Label>
                <textarea
                  id="conv_descripcion"
                  value={state.convocatoria.descripcion}
                  onChange={(e) => setState({ ...state, convocatoria: { ...state.convocatoria, descripcion: e.target.value } })}
                  placeholder="En dos o tres líneas: a quién va dirigida y qué apoya."
                  className={`${wizInputCls} !h-auto min-h-[110px] py-3 resize-y`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_apertura" className={wizLabelCls}>Fecha de apertura *</Label>
                  <input
                    id="fecha_apertura"
                    type="date"
                    value={state.convocatoria.fecha_apertura}
                    onChange={(e) => setState({ ...state, convocatoria: { ...state.convocatoria, fecha_apertura: e.target.value } })}
                    className={wizInputCls}
                    aria-invalid={validationErrors.fecha_apertura ? 'true' : undefined}
                  />
                  {validationErrors.fecha_apertura && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.fecha_apertura}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_cierre" className={wizLabelCls}>Fecha de cierre *</Label>
                  <input
                    id="fecha_cierre"
                    type="date"
                    value={state.convocatoria.fecha_cierre}
                    onChange={(e) => setState({ ...state, convocatoria: { ...state.convocatoria, fecha_cierre: e.target.value } })}
                    className={wizInputCls}
                    aria-invalid={validationErrors.fecha_cierre ? 'true' : undefined}
                  />
                  {validationErrors.fecha_cierre && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.fecha_cierre}</p>}
                  <p className="text-xs text-[var(--app-ink-2)]">Al llegar esta fecha se cierra sola y deja de recibir solicitudes.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="monto_maximo" className={wizLabelCls}>Monto máximo de apoyo (MXN) *</Label>
                  <input
                    id="monto_maximo"
                    type="number"
                    min={0}
                    value={state.convocatoria.monto_maximo_apoyo}
                    onChange={(e) => setState({ ...state, convocatoria: { ...state.convocatoria, monto_maximo_apoyo: parseFloat(e.target.value) || 0 } })}
                    className={wizInputCls}
                    aria-invalid={validationErrors.monto_maximo_apoyo ? 'true' : undefined}
                  />
                  {validationErrors.monto_maximo_apoyo && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.monto_maximo_apoyo}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="porcentaje_aportacion" className={wizLabelCls}>Aportación mínima del solicitante (%)</Label>
                  <input
                    id="porcentaje_aportacion"
                    type="number"
                    min={0}
                    max={100}
                    value={state.convocatoria.porcentaje_aportacion_minima}
                    onChange={(e) => setState({ ...state, convocatoria: { ...state.convocatoria, porcentaje_aportacion_minima: parseFloat(e.target.value) || 0 } })}
                    className={wizInputCls}
                    aria-invalid={validationErrors.porcentaje_aportacion_minima ? 'true' : undefined}
                  />
                  {validationErrors.porcentaje_aportacion_minima && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.porcentaje_aportacion_minima}</p>}
                  <p className="text-xs text-[var(--app-ink-2)]">Parte del proyecto que la institución cubre con recursos propios.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prog_nombre" className={wizLabelCls}>Nombre del programa *</Label>
                  <input
                    id="prog_nombre"
                    value={state.programa.nombre}
                    onChange={(e) => {
                      const nombre = e.target.value;
                      const clave = state.programa.clave || claveTouched.current ? state.programa.clave : claveDesdeNombre(nombre);
                      setState({ ...state, programa: { ...state.programa, nombre, clave } });
                    }}
                    placeholder="Ej. Prototipos de tecnología"
                    className={wizInputCls}
                    aria-invalid={validationErrors.nombre ? 'true' : undefined}
                  />
                  {validationErrors.nombre && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.nombre}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prog_clave" className={wizLabelCls}>Clave corta *</Label>
                  <input
                    id="prog_clave"
                    value={state.programa.clave}
                    maxLength={20}
                    onChange={(e) => {
                      claveTouched.current = true;
                      setState({ ...state, programa: { ...state.programa, clave: e.target.value.toUpperCase() } });
                    }}
                    placeholder="Ej. PROT"
                    className={`${wizInputCls} uppercase`}
                    aria-invalid={validationErrors.clave ? 'true' : undefined}
                  />
                  {validationErrors.clave && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.clave}</p>}
                  <p className="text-xs text-[var(--app-ink-2)]">Se propone sola a partir del nombre; aparece en folios y reportes.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tipo_apoyo" className={wizLabelCls}>Forma del apoyo *</Label>
                  <select
                    id="tipo_apoyo"
                    value={state.programa.tipo_apoyo}
                    onChange={(e) => setState({ ...state, programa: { ...state.programa, tipo_apoyo: e.target.value as WizardState['programa']['tipo_apoyo'] } })}
                    className={wizInputCls}
                  >
                    <option value="reembolso">Reembolso (se paga después de comprobar)</option>
                    <option value="concurrente">Concurrente (aportan ambas partes)</option>
                    <option value="honorarios">Honorarios (pago a personas)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monto_max_prog" className={wizLabelCls}>Monto máximo por proyecto (MXN) *</Label>
                  <input
                    id="monto_max_prog"
                    type="number"
                    min={0}
                    value={state.programa.monto_maximo}
                    onChange={(e) => setState({ ...state, programa: { ...state.programa, monto_maximo: parseFloat(e.target.value) || 0 } })}
                    className={wizInputCls}
                    aria-invalid={validationErrors.monto_maximo ? 'true' : undefined}
                  />
                  {validationErrors.monto_maximo && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.monto_maximo}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <p className={wizLabelCls}>Reglas del programa</p>

                <label className={wizCheckCard} style={{ borderColor: 'var(--app-rule)', backgroundColor: state.programa.tiene_etapas ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
                  <Checkbox id="tiene_etapas" checked={state.programa.tiene_etapas} onCheckedChange={(v) => setState({ ...state, programa: { ...state.programa, tiene_etapas: v as boolean } })} />
                  <span className="flex-1 min-w-[200px]">
                    <span className="block text-sm font-semibold text-[var(--app-ink)]">El apoyo se entrega por etapas</span>
                    <span className="block text-xs text-[var(--app-ink-2)]">Cada etapa lleva su propia entrega e informe.</span>
                  </span>
                  {state.programa.tiene_etapas && (
                    <span className="flex items-center gap-2 text-xs text-[var(--app-ink-2)]">
                      Etapas
                      <input type="number" aria-label="Número de etapas" value={state.programa.num_etapas} onChange={(e) => setState({ ...state, programa: { ...state.programa, num_etapas: parseInt(e.target.value) || 1 } })} min={1} max={10} className={`${wizInputCls} pl-3 !w-20 !min-h-10 !h-10`} />
                    </span>
                  )}
                </label>
                {validationErrors.num_etapas && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.num_etapas}</p>}

                <label className={wizCheckCard} style={{ borderColor: 'var(--app-rule)', backgroundColor: state.programa.tiene_equipo ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
                  <Checkbox id="tiene_equipo" checked={state.programa.tiene_equipo} onCheckedChange={(v) => setState({ ...state, programa: { ...state.programa, tiene_equipo: v as boolean } })} />
                  <span className="flex-1 min-w-[200px]">
                    <span className="block text-sm font-semibold text-[var(--app-ink)]">Requiere un equipo de trabajo</span>
                    <span className="block text-xs text-[var(--app-ink-2)]">El solicitante registra a los integrantes del proyecto.</span>
                  </span>
                  {state.programa.tiene_equipo && (
                    <span className="flex items-center gap-2 text-xs text-[var(--app-ink-2)]">
                      De
                      <input type="number" aria-label="Mínimo de integrantes" value={state.programa.min_miembros_equipo} onChange={(e) => setState({ ...state, programa: { ...state.programa, min_miembros_equipo: parseInt(e.target.value) || 1 } })} min={1} className={`${wizInputCls} pl-3 !w-16 !min-h-10 !h-10`} />
                      a
                      <input type="number" aria-label="Máximo de integrantes" value={state.programa.max_miembros_equipo} onChange={(e) => setState({ ...state, programa: { ...state.programa, max_miembros_equipo: parseInt(e.target.value) || 5 } })} min={1} className={`${wizInputCls} pl-3 !w-16 !min-h-10 !h-10`} />
                    </span>
                  )}
                </label>

                <label className={wizCheckCard} style={{ borderColor: 'var(--app-rule)', backgroundColor: state.programa.requiere_evaluacion_tecnica ? 'var(--tile-emerald-bg)' : 'var(--auth-field)' }}>
                  <Checkbox id="requiere_evaluacion" checked={state.programa.requiere_evaluacion_tecnica} onCheckedChange={(v) => setState({ ...state, programa: { ...state.programa, requiere_evaluacion_tecnica: v as boolean } })} />
                  <span className="flex-1 min-w-[200px]">
                    <span className="block text-sm font-semibold text-[var(--app-ink)]">Pasa por evaluación técnica</span>
                    <span className="block text-xs text-[var(--app-ink-2)]">Un evaluador califica el proyecto con los criterios del paso 6.</span>
                  </span>
                  {state.programa.requiere_evaluacion_tecnica && (
                    <span className="flex items-center gap-2 text-xs text-[var(--app-ink-2)]">
                      Aprueba desde
                      <input id="puntaje_minimo" type="number" aria-label="Calificación mínima para aprobar" value={state.programa.puntaje_minimo_aprobatorio} onChange={(e) => setState({ ...state, programa: { ...state.programa, puntaje_minimo_aprobatorio: parseInt(e.target.value) || 80 } })} min={0} max={100} className={`${wizInputCls} pl-3 !w-20 !min-h-10 !h-10`} />
                      de 100
                    </span>
                  )}
                </label>
                {validationErrors.puntaje_minimo && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.puntaje_minimo}</p>}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              {validationErrors.campos && (
                <AlertBox type="error" message={validationErrors.campos} />
              )}

              <Button onClick={() => openCampoModal()}>
                <Plus className="h-4 w-4" /> Agregar pregunta
              </Button>

              {state.campos.length === 0 ? (
                <EmptyList text="Agrega al menos una pregunta para continuar." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pregunta</TableHead>
                      <TableHead>Tipo de respuesta</TableHead>
                      <TableHead>Obligatoria</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.campos.map((campo, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium whitespace-normal">{campo.etiqueta}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TIPO_CAMPO_LABELS[campo.tipo_campo] ?? campo.tipo_campo}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={campo.requerido ? 'default' : 'secondary'}>{campo.requerido ? 'Sí' : 'No'}</Badge>
                        </TableCell>
                        <TableCell>{campo.orden}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button variant="soft" size="icon-sm" onClick={() => openCampoModal(idx)} aria-label="Editar" title="Editar">
                              <Edit2 />
                            </Button>
                            <Button variant="destructive" size="icon-sm" onClick={() => deleteCampo(idx)} aria-label="Eliminar" title="Eliminar">
                              <Trash2 />
                            </Button>
                          </div>
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

              <Button onClick={() => openDocumentoModal()}>
                <Plus className="h-4 w-4" /> Agregar documento
              </Button>

              {state.documentos.length === 0 ? (
                <EmptyList text="Agrega al menos un documento para continuar." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Obligatorio</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.documentos.map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium whitespace-normal">{doc.nombre}</TableCell>
                        <TableCell>
                          <Badge variant={doc.obligatorio ? 'default' : 'secondary'}>{doc.obligatorio ? 'Sí' : 'No'}</Badge>
                        </TableCell>
                        <TableCell>{doc.orden}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button variant="soft" size="icon-sm" onClick={() => openDocumentoModal(idx)} aria-label="Editar" title="Editar">
                              <Edit2 />
                            </Button>
                            <Button variant="destructive" size="icon-sm" onClick={() => deleteDocumento(idx)} aria-label="Eliminar" title="Eliminar">
                              <Trash2 />
                            </Button>
                          </div>
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

              <Button onClick={() => openRubroModal()}>
                <Plus className="h-4 w-4" /> Agregar concepto
              </Button>

              {state.rubros.length === 0 ? (
                <EmptyList text="Agrega al menos un concepto de gasto para continuar." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Porcentaje máximo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.rubros.map((rubro, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium whitespace-normal">{rubro.nombre}</TableCell>
                        <TableCell>{rubro.porcentaje_maximo}%</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button variant="soft" size="icon-sm" onClick={() => openRubroModal(idx)} aria-label="Editar" title="Editar">
                              <Edit2 />
                            </Button>
                            <Button variant="destructive" size="icon-sm" onClick={() => deleteRubro(idx)} aria-label="Eliminar" title="Eliminar">
                              <Trash2 />
                            </Button>
                          </div>
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

              <div className="p-4 rounded-[14px] flex items-center gap-3" style={{ backgroundColor: totalPonderacion === 100 ? 'var(--tile-emerald-bg)' : 'var(--tile-gold-bg)' }}>
                {totalPonderacion === 100
                  ? <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--tile-emerald-fg)' }} aria-label="Correcto" />
                  : <XCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--tile-gold-fg)' }} aria-label="Debe sumar 100" />}
                <p className="text-sm text-[var(--app-ink)]">
                  <strong>Peso total:</strong> {totalPonderacion} %.{' '}
                  {totalPonderacion === 100 ? 'Los criterios ya suman 100 %.' : 'Entre todos los criterios deben sumar 100 %.'}
                </p>
              </div>

              <Button onClick={() => openCriterioModal()}>
                <Plus className="h-4 w-4" /> Agregar criterio
              </Button>

              {state.criterios.length === 0 ? (
                <EmptyList text="Agrega al menos un criterio para continuar." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criterio</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Calificación máxima</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.criterios.map((criterio, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium whitespace-normal">{criterio.nombre}</TableCell>
                        <TableCell>
                          <Badge variant={criterio.ponderacion > 0 ? 'default' : 'destructive'}>
                            {criterio.ponderacion}%
                          </Badge>
                        </TableCell>
                        <TableCell>{criterio.puntaje_maximo}</TableCell>
                        <TableCell>{criterio.orden}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button variant="soft" size="icon-sm" onClick={() => openCriterioModal(idx)} aria-label="Editar" title="Editar">
                              <Edit2 />
                            </Button>
                            <Button variant="destructive" size="icon-sm" onClick={() => deleteCriterio(idx)} aria-label="Eliminar" title="Eliminar">
                              <Trash2 />
                            </Button>
                          </div>
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
                <AlertBox type="error" title="No se pudo guardar" message={saveError} />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Convocatoria</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><strong>Nombre:</strong> {state.convocatoria.nombre}</p>
                    <p><strong>Ejercicio fiscal:</strong> {state.convocatoria.ejercicio_fiscal}</p>
                    <p><strong>Apertura:</strong> {state.convocatoria.fecha_apertura}</p>
                    <p><strong>Cierre:</strong> {state.convocatoria.fecha_cierre}</p>
                    <p><strong>Apoyo máximo:</strong> ${state.convocatoria.monto_maximo_apoyo.toLocaleString()}</p>
                    <p><strong>Aportación concurrente:</strong> {state.convocatoria.porcentaje_aportacion_minima}%</p>
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Programa</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><strong>Clave:</strong> {state.programa.clave}</p>
                    <p><strong>Nombre:</strong> {state.programa.nombre}</p>
                    <p><strong>Forma del apoyo:</strong> {TIPO_APOYO_LABELS[state.programa.tipo_apoyo] ?? state.programa.tipo_apoyo}</p>
                    <p><strong>Monto máximo:</strong> ${state.programa.monto_maximo.toLocaleString()}</p>
                    <p><strong>Etapas:</strong> {state.programa.tiene_etapas ? `Sí (${state.programa.num_etapas})` : 'No'}</p>
                    <p><strong>Equipo:</strong> {state.programa.tiene_equipo ? `Sí (de ${state.programa.min_miembros_equipo} a ${state.programa.max_miembros_equipo} personas)` : 'No'}</p>
                    <p><strong>Calificación mínima para aprobar:</strong> {state.programa.puntaje_minimo_aprobatorio}</p>
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Preguntas ({state.campos.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1.5">
                    {state.campos.map((c, i) => (
                      <p key={i} className="text-[var(--app-ink)] flex items-center gap-2 flex-wrap">{c.etiqueta} <Badge variant="outline">{TIPO_CAMPO_LABELS[c.tipo_campo] ?? c.tipo_campo}</Badge></p>
                    ))}
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Documentos ({state.documentos.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1.5">
                    {state.documentos.map((d, i) => (
                      <p key={i} className="text-[var(--app-ink)] flex items-center gap-2 flex-wrap">{d.nombre} {d.obligatorio && <Badge>Obligatorio</Badge>}</p>
                    ))}
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Conceptos de gasto ({state.rubros.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1.5">
                    {state.rubros.map((r, i) => (
                      <p key={i} className="text-[var(--app-ink)] flex items-center gap-2 flex-wrap">{r.nombre} <Badge variant="outline">{r.porcentaje_maximo}%</Badge></p>
                    ))}
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Criterios ({state.criterios.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1.5">
                    {state.criterios.map((cr, i) => (
                      <p key={i} className="text-[var(--app-ink)] flex items-center gap-2 flex-wrap">{cr.nombre} <Badge variant="outline">{cr.ponderacion}%</Badge></p>
                    ))}
                    <p className="text-xs text-[var(--app-ink-2)] mt-2 border-t border-[var(--app-rule)] pt-2">Peso total: {totalPonderacion}%</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t border-[var(--app-rule)] px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || saving}
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>

          {currentStep < 7 ? (
            <Button
              onClick={handleNext}
              disabled={saving}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSaveConvocatoria}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {saveProgress || 'Guardando...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Crear convocatoria
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
