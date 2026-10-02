'use client';

import { useState, useCallback, useRef , useEffect } from 'react';
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
import SelectorFormatos from '@/components/admin/SelectorFormatos';
import {
  LIMITES, CLAVE_PROGRAMA_RE, armarPayload, erroresDelServidor, restaurarBorrador, tieneContenido, pasosDe,
  leerCatalogo, programaRepetido,
  type EstadoAsistente, type PasoAsistente, type ProgramaCatalogo, type SistemaPrograma,
} from '@/lib/asistente-convocatoria';
import SelectorPrograma from '@/components/admin/SelectorPrograma';
import { Save, CloudOff, Cloud, Banknote, Package } from 'lucide-react';
import ConfigEspecieForm from '@/components/admin/especie/ConfigEspecieForm';
import { configVacia, validarConfig, CAMPOS_CLUB, CAMPOS_INTEGRANTE, REVISA_ETIQUETA, TIPO_CAMPO_ETIQUETA, type ConfigEspecie } from '@/lib/especie';

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
  // E45 (punto 6): tipos y tamaño que acepta este documento.
  formatos: string[];
  tamano_mb: number;
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
    // E45 (punto 5): periodo de la convocatoria (alcance de visión por periodo).
    periodo_id: string;
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
    tipo_apoyo: 'reembolso' | 'concurrente' | 'honorarios' | 'especie';
    monto_maximo: number;
    tiene_etapas: boolean;
    num_etapas: number;
    tiene_equipo: boolean;
    min_miembros_equipo: number;
    max_miembros_equipo: number;
    requiere_evaluacion_tecnica: boolean;
    puntaje_minimo_aprobatorio: number;
    // E54: programa del catálogo público (existente) o uno nuevo que se crea oculto.
    programa_publico_id: number | null;
    programa_nuevo: boolean;
    sistema: SistemaPrograma;
  };
  campos: Campo[];
  documentos: Documento[];
  rubros: Rubro[];
  criterios: Criterio[];
  // E52: configuración de "Apoyo en especie" (clubes y kit).
  especie: ConfigEspecie;
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
  especie: 'En especie (kits a clubes escolares)',
};

// Pasos según la modalidad (lib/asistente-convocatoria.ts): económico = 7, en especie = 5.
const ETIQUETA_PASO: Record<PasoAsistente, string> = {
  convocatoria: 'Convocatoria',
  programa: 'Programa',
  campos: 'Preguntas',
  documentos: 'Documentos',
  rubros: 'Conceptos de gasto',
  criterios: 'Criterios',
  especie: 'Club y kit',
  revision: 'Revisión',
};
const TITULO_PASO: Record<PasoAsistente, [string, string]> = {
  convocatoria: ['Información de la convocatoria', 'Escribe los datos generales que verán los solicitantes.'],
  programa: ['Configuración del programa', 'Define cómo se entrega el apoyo y qué reglas aplican.'],
  campos: ['Preguntas del formulario', 'Estas son las preguntas que responderá el solicitante en su formulario.'],
  documentos: ['Documentos que se piden', 'Indica qué archivos debe adjuntar el solicitante.'],
  rubros: ['Conceptos de gasto', 'Define en qué se puede usar el dinero del apoyo.'],
  criterios: ['Criterios de evaluación', 'Indica qué se califica y cuánto pesa cada aspecto.'],
  especie: ['Clubes y kit', 'Cuántos integrantes, qué kit se entrega y qué datos se piden a cada club.'],
  revision: ['Revisa y guarda', 'Revisa toda la información antes de crear la convocatoria.'],
};

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
    periodo_id: '',
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
    programa_publico_id: null,
    programa_nuevo: false,
    sistema: 'sigae',
  },
  campos: [],
  documentos: [],
  rubros: [],
  criterios: [],
  especie: configVacia(),
};

export default function ConvocatoriasNuevaPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(emptyWizardState);
  const claveTouched = useRef(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  // E52: la modalidad decide los pasos (económico 7, en especie 5).
  const esEspecie = state.programa.tipo_apoyo === 'especie';
  const pasos = pasosDe(state as unknown as EstadoAsistente);
  const totalPasos = pasos.length;
  const pasoActual: PasoAsistente = pasos[currentStep - 1] ?? 'revision';
  const [erroresEspecie, setErroresEspecie] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  // E47: errores del servidor, uno por línea y con el paso donde se corrigen.
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  // ── E47: borrador en el servidor (autoguardado) ──
  const [borradorId, setBorradorId] = useState<number | null>(null);
  const [estadoBorrador, setEstadoBorrador] = useState<'idle' | 'guardando' | 'guardado' | 'error'>('idle');
  const [guardadoEn, setGuardadoEn] = useState<Date | null>(null);
  const [cargandoBorrador, setCargandoBorrador] = useState(false);
  const borradorIdRef = useRef<number | null>(null);
  const guardandoRef = useRef<Promise<number | null> | null>(null);
  const pendienteRef = useRef(false);
  const saltarAutoguardado = useRef(true); // no guardar el estado vacío inicial ni el recién cargado

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
    formatos: ['pdf'],
    tamano_mb: 5,
  });
  // E54: catálogo de programas (Contenido público) para el paso 2; null mientras carga.
  const [catalogo, setCatalogo] = useState<ProgramaCatalogo[] | null>(null);
  const [errorCatalogo, setErrorCatalogo] = useState(false);
  const cargarCatalogo = useCallback(() => {
    setErrorCatalogo(false);
    api.get('/admin/programas-publicos')
      .then(({ data }) => setCatalogo(leerCatalogo(data)))
      .catch(() => { setCatalogo([]); setErrorCatalogo(true); });
  }, []);
  useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);
  // E45: periodos activos para el selector del paso 1.
  const [periodos, setPeriodos] = useState<{ id: number; nombre: string; activo: boolean }[]>([]);
  useEffect(() => {
    api.get('/admin/periodos').then(({ data }) => setPeriodos(Array.isArray(data) ? data.filter((p: { activo: boolean }) => p.activo) : [])).catch(() => setPeriodos([]));
  }, []);

  // ── E47: borradores ──
  // ?borrador=ID → retoma lo guardado (el servidor solo devuelve borradores propios).
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('borrador'));
    if (!Number.isInteger(id) || id <= 0) return;
    setCargandoBorrador(true);
    api.get(`/admin/asistente-convocatoria/borradores/${id}`)
      .then(({ data }) => {
        saltarAutoguardado.current = true;
        const restaurado = restaurarBorrador(data?.datos, emptyWizardState as unknown as EstadoAsistente);
        setState(restaurado as unknown as WizardState);
        const paso = Number(data?.paso);
        setCurrentStep(Number.isInteger(paso) && paso >= 1 && paso <= pasosDe(restaurado).length ? paso : 1);
        borradorIdRef.current = id;
        setBorradorId(id);
        setEstadoBorrador('guardado');
        setGuardadoEn(data?.updated_at ? new Date(data.updated_at) : null);
        claveTouched.current = true;
      })
      .catch(() => setInlineAlert({ type: 'error', message: 'No se encontró ese borrador. Empiezas una convocatoria nueva.' }))
      .finally(() => setCargandoBorrador(false));
  }, []);

  // Último estado a guardar; las peticiones se hacen de una en una y siempre con lo más reciente.
  const ultimo = useRef<{ s: WizardState; paso: number }>({ s: emptyWizardState, paso: 1 });
  const sinGuardar = useRef(false);
  const guardarBorrador = useCallback(async (): Promise<number | null> => {
    if (guardandoRef.current) { pendienteRef.current = true; return guardandoRef.current; }
    const run = (async () => {
      do {
        pendienteRef.current = false;
        const { s, paso } = ultimo.current;
        if (!tieneContenido(s as unknown as EstadoAsistente)) break;
        setEstadoBorrador('guardando');
        try {
          const body = { paso, datos: { v: 1, state: s } };
          if (borradorIdRef.current) {
            await api.put(`/admin/asistente-convocatoria/borradores/${borradorIdRef.current}`, body);
          } else {
            const { data } = await api.post('/admin/asistente-convocatoria/borradores', body);
            const id = Number(data?.id);
            if (Number.isInteger(id) && id > 0) {
              borradorIdRef.current = id;
              setBorradorId(id);
              // La URL lleva el borrador: recargar o copiar el enlace retoma el trabajo.
              const url = new URL(window.location.href);
              url.searchParams.set('borrador', String(id));
              window.history.replaceState(window.history.state, '', url.toString());
            }
          }
          sinGuardar.current = false;
          setEstadoBorrador('guardado');
          setGuardadoEn(new Date());
        } catch {
          setEstadoBorrador('error');
          break;
        }
      } while (pendienteRef.current);
      return borradorIdRef.current;
    })();
    guardandoRef.current = run;
    try { return await run; } finally { guardandoRef.current = null; }
  }, []);

  // Autoguardado 1.5 s después del último cambio.
  useEffect(() => {
    ultimo.current = { s: state, paso: currentStep };
    if (saltarAutoguardado.current) { saltarAutoguardado.current = false; return; }
    if (saving || cargandoBorrador) return;
    sinGuardar.current = true;
    const t = window.setTimeout(() => { void guardarBorrador(); }, 1500);
    return () => window.clearTimeout(t);
  }, [state, currentStep, guardarBorrador, saving, cargandoBorrador]);

  // Aviso del navegador si se intenta salir con cambios aún sin guardar.
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (sinGuardar.current && tieneContenido(ultimo.current.s as unknown as EstadoAsistente)) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, []);

  const guardarYSalir = async () => {
    ultimo.current = { s: state, paso: currentStep };
    if (!tieneContenido(state as unknown as EstadoAsistente)) { router.push('/admin/convocatorias'); return; }
    await guardarBorrador();
    if (!sinGuardar.current && borradorIdRef.current) router.push('/admin/convocatorias');
    else setInlineAlert({ type: 'error', message: 'No se pudo guardar el borrador. Revisa tu conexión e inténtalo de nuevo.' });
  };

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
    const especie = state.programa.tipo_apoyo === 'especie';
    const clave = pasosDe(state as unknown as EstadoAsistente)[step - 1];

    if (clave === 'convocatoria') {
      if (!state.convocatoria.nombre.trim()) errors.nombre = 'Nombre requerido';
      if (!state.convocatoria.ejercicio_fiscal.trim()) errors.ejercicio_fiscal = 'Ejercicio fiscal requerido';
      if (!state.convocatoria.fecha_apertura) errors.fecha_apertura = 'Fecha de apertura requerida';
      if (!state.convocatoria.fecha_cierre) errors.fecha_cierre = 'Fecha de cierre requerida';
      if (state.convocatoria.fecha_apertura > state.convocatoria.fecha_cierre) {
        errors.fecha_apertura = 'Apertura no puede ser después de cierre';
      }
      if (!especie && state.convocatoria.monto_maximo_apoyo <= 0) errors.monto_maximo_apoyo = 'Monto debe ser > 0';
      if (!especie && (state.convocatoria.porcentaje_aportacion_minima < 0 || state.convocatoria.porcentaje_aportacion_minima > 100)) {
        errors.porcentaje_aportacion_minima = 'Porcentaje debe estar entre 0 y 100';
      }
      // E47: mismos límites que el servidor, para no descubrirlos hasta el final.
      if (state.convocatoria.nombre.length > LIMITES.nombreConvocatoria) errors.nombre = `Máximo ${LIMITES.nombreConvocatoria} caracteres.`;
      if (state.convocatoria.ejercicio_fiscal.trim() && !/^\d{4}$/.test(state.convocatoria.ejercicio_fiscal.trim())) errors.ejercicio_fiscal = 'Escribe el año con 4 dígitos (p. ej. 2026).';
    }

    if (clave === 'programa') {
      if (!state.programa.clave.trim()) errors.clave = 'Clave requerida';
      else if (!CLAVE_PROGRAMA_RE.test(state.programa.clave.trim())) errors.clave = 'Usa solo letras, números y _ - / . (sin espacios).';
      // E54: o un programa del catálogo o uno nuevo con nombre que no repita otro del mismo sistema.
      if (!state.programa.programa_nuevo) {
        if (!state.programa.programa_publico_id) errors.programa = 'Elige el programa al que pertenece esta convocatoria, o crea uno nuevo.';
      } else if (!state.programa.nombre.trim()) errors.nombre = 'Escribe el nombre del programa nuevo.';
      else if (state.programa.nombre.length > LIMITES.nombrePrograma) errors.nombre = `Máximo ${LIMITES.nombrePrograma} caracteres.`;
      else if (catalogo && programaRepetido(catalogo, state.programa.sistema, state.programa.nombre)) {
        errors.nombre = 'Ya existe un programa con ese nombre: elígelo de la lista para asociarle esta convocatoria.';
      }
      if (!especie) {
        if (state.programa.monto_maximo < 1000) errors.monto_maximo = 'El monto máximo por proyecto debe ser de al menos $1,000.';
        if (state.programa.tiene_equipo && state.programa.min_miembros_equipo > state.programa.max_miembros_equipo) {
          errors.num_etapas = 'El máximo de integrantes no puede ser menor que el mínimo.';
        }
        if (state.programa.tiene_etapas && state.programa.num_etapas < 1) {
          errors.num_etapas = 'Número de etapas debe ser > 0';
        }
        if (state.programa.puntaje_minimo_aprobatorio < 0 || state.programa.puntaje_minimo_aprobatorio > 100) {
          errors.puntaje_minimo = 'Puntaje debe estar entre 0 y 100';
        }
      }
    }

    if (clave === 'especie') {
      const e = validarConfig(state.especie);
      setErroresEspecie(e);
      if (Object.keys(e).length) errors.especie = 'Revisa los datos marcados.';
    }

    if (clave === 'campos') {
      if (state.campos.length === 0) errors.campos = 'Agrega al menos un campo';
      const i = state.campos.findIndex((c) => c.etiqueta.length > LIMITES.etiquetaPregunta || (c.tipo_campo === 'select' && !c.opciones_json?.trim()));
      if (i >= 0) errors.campos = `Revisa la pregunta ${i + 1}: el texto admite hasta ${LIMITES.etiquetaPregunta} caracteres y las de lista necesitan opciones.`;
    }

    if (clave === 'documentos') {
      // En especie los documentos del programa son opcionales: la carta de la escuela siempre se pide.
      if (!especie && state.documentos.length === 0) errors.documentos = 'Agrega al menos un documento';
      if (especie && state.documentos.some((d) => d.clave === 'carta_escuela')) errors.documentos = 'La carta de la escuela ya se pide siempre; cambia el nombre de ese documento.';
      const i = state.documentos.findIndex((d) => d.nombre.length > LIMITES.nombreDocumento);
      if (i >= 0) errors.documentos = `El nombre del documento ${i + 1} pasa de ${LIMITES.nombreDocumento} caracteres; lo demás va en «Qué debe contener».`;
    }

    if (clave === 'rubros') {
      if (state.rubros.length === 0) errors.rubros = 'Agrega al menos un rubro';
      const i = state.rubros.findIndex((r) => r.nombre.length > LIMITES.nombreRubro || r.clave.length > LIMITES.claveRubro);
      if (i >= 0) errors.rubros = `El concepto ${i + 1} tiene un nombre demasiado largo (máximo ${LIMITES.nombreRubro} caracteres).`;
    }

    if (clave === 'criterios') {
      if (state.criterios.length === 0) errors.criterios = 'Agrega al menos un criterio';
      const i = state.criterios.findIndex((c) => c.nombre.length > LIMITES.nombreCriterio || c.puntaje_maximo < 1 || c.puntaje_maximo > 100);
      if (i >= 0) errors.criterios = `Revisa el criterio ${i + 1}: el nombre admite hasta ${LIMITES.nombreCriterio} caracteres (el detalle va en la descripción) y la calificación máxima va de 1 a 100.`;
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
        formatos: ['pdf'],
        tamano_mb: 5,
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
    if (criterioForm.nombre.length > LIMITES.nombreCriterio) {
      setInlineAlert({ type: 'error', message: `El nombre del criterio admite hasta ${LIMITES.nombreCriterio} caracteres. Deja un nombre corto y pon el detalle en la descripción.` });
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

  /**
   * E47: UNA sola petición. El servidor valida todo y crea programa, preguntas, documentos, conceptos, criterios y
   * convocatoria en una transacción: si algo falla no se crea nada y se puede corregir y reintentar.
   */
  const handleSaveConvocatoria = async () => {
    for (let paso = 1; paso < totalPasos; paso++) {
      if (!validateStep(paso)) { setCurrentStep(paso); return; }
    }
    setSaving(true);
    setSaveError('');
    setSaveErrors([]);
    setSaveProgress('Creando la convocatoria…');
    try {
      // Primero asegura el borrador con lo último (si la red falla a medio camino, nada se pierde).
      ultimo.current = { s: state, paso: totalPasos };
      await guardarBorrador();
      const { data } = await api.post('/admin/asistente-convocatoria', armarPayload(state as unknown as EstadoAsistente, borradorIdRef.current));
      sinGuardar.current = false;
      setSaveProgress(data?.programa && data.programa.activo === false
        ? `¡Convocatoria creada! El programa «${String(data.programa.nombre ?? '').slice(0, 120)}» está oculto en la página pública: complétalo y actívalo en Contenido público. Abriendo la ficha…`
        : '¡Convocatoria creada! Abriendo su ficha para que cargues el banner…');
      const nuevaId = Number(data?.convocatoria?.id);
      setTimeout(() => {
        router.push(Number.isInteger(nuevaId) && nuevaId > 0 ? `/admin/convocatorias/${nuevaId}` : '/admin/convocatorias');
      }, data?.programa?.activo === false ? 4000 : 1200);
    } catch (error: unknown) {
      const res = (error as { response?: { status?: number; data?: { message?: string; errors?: unknown } } })?.response;
      const detalle = res?.status === 422 ? erroresDelServidor(res.data?.errors, state as unknown as EstadoAsistente) : null;
      if (detalle) {
        setSaveErrors(detalle.lineas);
        setSaveError(detalle.lineas.length === 1 ? 'Hay un dato por corregir.' : `Hay ${detalle.lineas.length} datos por corregir.`);
      } else if (res?.status === 429) {
        setSaveError('Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.');
      } else {
        setSaveError(res?.data?.message && res.status !== 500 ? res.data.message : 'No se pudo crear la convocatoria. Tu trabajo está guardado como borrador; inténtalo de nuevo en un momento.');
      }
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
        description={esEspecie
          ? 'En cinco pasos defines la convocatoria, su programa, cómo se forman los clubes, el kit y los documentos que pedirás.'
          : 'En siete pasos defines la convocatoria, su programa, las preguntas y documentos que pedirás, en qué se puede gastar el apoyo y cómo se evaluará.'}
        icon={<Megaphone className="h-5 w-5" />}
      />

      <ol className="flex items-center justify-center gap-1" aria-label={`Paso ${currentStep} de ${totalPasos}: ${ETIQUETA_PASO[pasoActual]}`}>
        {pasos.map((clavePaso, i) => {
          const label = ETIQUETA_PASO[clavePaso];
          const step = i + 1;
          const done = currentStep > step;
          const active = currentStep === step;
          return (
            <li key={step} className="flex items-center gap-1">
              <span
                title={label}
                aria-current={active ? 'step' : undefined}
                className={`w-7 h-7 text-xs min-[380px]:w-9 min-[380px]:h-9 min-[380px]:text-sm sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold transition-[transform,background-color,color] duration-200 ${
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
              {step < totalPasos && <span className="hidden min-[380px]:block w-2 sm:w-3 h-0.5 bg-[var(--app-rule)]" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <p className="text-center text-xs font-bold uppercase tracking-[0.14em] -mt-3" style={{ color: 'var(--auth-vino)' }}>
        Paso {currentStep} de {totalPasos} · {ETIQUETA_PASO[pasoActual]}
      </p>
      {/* E47: estado del borrador (autoguardado en el servidor). */}
      <p className="-mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--app-ink-2)]" aria-live="polite">
        {cargandoBorrador ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Abriendo tu borrador…</>)
          : estadoBorrador === 'guardando' ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Guardando borrador…</>)
          : estadoBorrador === 'error' ? (<span className="inline-flex items-center gap-1.5" style={{ color: 'var(--auth-danger)' }}><CloudOff className="h-3.5 w-3.5" aria-hidden="true" />No se pudo guardar el borrador; se reintentará con tu siguiente cambio.</span>)
          : estadoBorrador === 'guardado' && guardadoEn ? (<><Cloud className="h-3.5 w-3.5" aria-hidden="true" />Borrador guardado a las {guardadoEn.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</>)
          : (<>Lo que captures se guarda solo como borrador.</>)}
        {borradorId && <span className="sr-only"> (borrador {borradorId})</span>}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{TITULO_PASO[pasoActual][0]}</CardTitle>
          <CardDescription>
            {pasoActual === 'documentos' && esEspecie
              ? 'Documentos que cada club debe subir, además de la carta de consentimiento de la escuela (esa se pide siempre).'
              : TITULO_PASO[pasoActual][1]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pasoActual === 'convocatoria' && (
            <div className="space-y-5">
              {/* E52: la modalidad se elige primero; cambia los pasos y los datos que se piden. */}
              <fieldset className="space-y-2">
                <legend className={wizLabelCls}>¿Qué tipo de apoyo entrega esta convocatoria? *</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {([
                    { v: false, t: 'Apoyo económico', d: 'Dinero para proyectos: monto, conceptos de gasto y evaluación técnica.', icon: <Banknote className="h-5 w-5" aria-hidden="true" /> },
                    { v: true, t: 'Apoyo en especie', d: 'Kits para clubes escolares: líder, integrantes y documentos del club.', icon: <Package className="h-5 w-5" aria-hidden="true" /> },
                  ] as const).map((o) => (
                    <label key={String(o.v)} className="flex cursor-pointer items-start gap-3 rounded-[16px] border-2 px-4 py-3 transition-colors"
                      style={{ borderColor: esEspecie === o.v ? 'var(--auth-vino)' : 'var(--app-rule)', backgroundColor: esEspecie === o.v ? 'var(--auth-vino-soft)' : 'var(--auth-field)' }}>
                      <input type="radio" name="modalidad" className="mt-1 accent-[var(--auth-vino)]" checked={esEspecie === o.v}
                        onChange={() => setState({ ...state, programa: { ...state.programa, tipo_apoyo: o.v ? 'especie' : 'concurrente' } })} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]">{o.icon}{o.t}</span>
                        <span className="block text-xs text-[var(--app-ink-2)]">{o.d}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conv_nombre" className={wizLabelCls}>Nombre de la convocatoria *</Label>
                  <input
                    id="conv_nombre"
                    maxLength={LIMITES.nombreConvocatoria}
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
                <Label htmlFor="conv_periodo" className={wizLabelCls}>Periodo</Label>
                <select
                  id="conv_periodo"
                  value={state.convocatoria.periodo_id}
                  onChange={(e) => setState({ ...state, convocatoria: { ...state.convocatoria, periodo_id: e.target.value } })}
                  className="h-11 w-full"
                >
                  <option value="">Sin periodo</option>
                  {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <p className="text-xs text-[var(--app-ink-2)]">Los usuarios con alcance por periodo solo verán las convocatorias de sus periodos. Se administran en Configuración › Periodos.</p>
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

              {!esEspecie && (
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
              )}
            </div>
          )}

          {pasoActual === 'programa' && (
            <div className="space-y-5">
              {/* E54: la convocatoria pertenece a un programa del catálogo (Contenido público) o a uno nuevo. */}
              <SelectorPrograma
                catalogo={catalogo}
                errorCarga={errorCatalogo}
                onReintentar={cargarCatalogo}
                valor={{ id: state.programa.programa_publico_id, nuevo: state.programa.programa_nuevo, nombre: state.programa.nombre, sistema: state.programa.sistema }}
                error={validationErrors.programa ?? validationErrors.nombre}
                maxNombre={LIMITES.nombrePrograma}
                onChange={(v) => {
                  // La clave corta se propone sola (nombre + ejercicio) mientras el admin no la haya escrito.
                  const propuesta = v.nombre ? `${claveDesdeNombre(v.nombre)}/${state.convocatoria.ejercicio_fiscal}`.slice(0, 20) : '';
                  const clave = claveTouched.current ? state.programa.clave : (claveDesdeNombre(v.nombre) ? propuesta : '');
                  setState({ ...state, programa: { ...state.programa, programa_publico_id: v.id, programa_nuevo: v.nuevo, nombre: v.nombre, sistema: v.sistema, clave } });
                  // Al elegir o escribir, se retiran los avisos viejos de este bloque (se revalida al dar «Siguiente»).
                  setValidationErrors((prev) => {
                    const { programa: _p, nombre: _n, ...resto } = prev;
                    if (clave) delete resto.clave;
                    return resto;
                  });
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prog_clave" className={wizLabelCls}>Clave corta *</Label>
                  <input
                    id="prog_clave"
                    value={state.programa.clave}
                    maxLength={20}
                    onChange={(e) => {
                      claveTouched.current = true;
                      setState({ ...state, programa: { ...state.programa, clave: e.target.value.toUpperCase() } });
                      setValidationErrors((prev) => { const { clave: _c, ...resto } = prev; return resto; });
                    }}
                    placeholder="Ej. PROT"
                    className={`${wizInputCls} uppercase`}
                    aria-invalid={validationErrors.clave ? 'true' : undefined}
                  />
                  {validationErrors.clave && <p className={wizErrCls} style={{ color: 'var(--auth-danger)' }}>{validationErrors.clave}</p>}
                  <p className="text-xs text-[var(--app-ink-2)]">Identifica a esta convocatoria en folios y reportes (p. ej. LEGO/2026). Se propone sola; debe ser distinta en cada convocatoria.</p>
                </div>
              </div>

              {esEspecie ? (
                <p className="rounded-[14px] border px-4 py-3 text-sm text-[var(--app-ink)]" style={{ borderColor: 'var(--app-rule)', backgroundColor: 'var(--tile-sky-bg)' }}>
                  <strong>Apoyo en especie.</strong> No hay montos, conceptos de gasto ni evaluación técnica: cada club recibe el kit.
                  En el siguiente paso defines cómo se forman los clubes y qué datos se piden. Para cambiar de modalidad, vuelve al paso 1.
                </p>
              ) : (
              <>
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
              </>
              )}
            </div>
          )}

          {pasoActual === 'especie' && (
            <div className="space-y-4">
              {validationErrors.especie && <AlertBox type="error" message={validationErrors.especie} />}
              <ConfigEspecieForm idBase="wiz-esp" value={state.especie} errores={erroresEspecie}
                onChange={(especie) => setState({ ...state, especie })} />
            </div>
          )}

          {pasoActual === 'campos' && (
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
                            maxLength={LIMITES.etiquetaPregunta}
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

          {pasoActual === 'documentos' && (
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
                            maxLength={LIMITES.nombreDocumento}
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
                    key: 'archivo',
                    label: 'Archivo',
                    question: '¿Qué tipo de archivo y de qué tamaño?',
                    content: (
                      <SelectorFormatos idBase="doc-wizard" formatos={documentoForm.formatos} tamano={documentoForm.tamano_mb}
                        onChange={(formatos, tamano_mb) => setDocumentoForm({ ...documentoForm, formatos, tamano_mb })} />
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

          {pasoActual === 'rubros' && (
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
                            maxLength={LIMITES.nombreRubro}
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

          {pasoActual === 'criterios' && (
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
                    validate: () => (!criterioForm.nombre.trim() ? 'Escribe el nombre del criterio.'
                      : criterioForm.nombre.length > LIMITES.nombreCriterio ? `El nombre admite hasta ${LIMITES.nombreCriterio} caracteres; pon el detalle en la descripción.` : null),
                    content: (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="criterio_nombre" className={wizLabelCls}>Nombre del criterio *</Label>
                          <input
                            id="criterio_nombre"
                            value={criterioForm.nombre}
                            maxLength={LIMITES.nombreCriterio}
                            onChange={(e) => setCriterioForm({ ...criterioForm, nombre: e.target.value })}
                            placeholder="Ej. Viabilidad técnica"
                            className={wizInputCls}
                            aria-describedby="criterio_nombre_ayuda"
                          />
                          <p id="criterio_nombre_ayuda" className="text-xs text-[var(--app-ink-2)]">
                            {criterioForm.nombre.length} / {LIMITES.nombreCriterio}. Un nombre corto; listas o explicaciones van en la descripción.
                          </p>
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
                    validate: () => (criterioForm.ponderacion <= 0 || criterioForm.ponderacion > 100 ? 'El peso va de 1 a 100.'
                      : criterioForm.puntaje_maximo < 1 || criterioForm.puntaje_maximo > 100 ? 'La calificación máxima va de 1 a 100.' : null),
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
                            min={1}
                            max={100}
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

          {pasoActual === 'revision' && (
            <div className="space-y-6">
              {saveError && (
                <div role="alert" className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--auth-danger)', backgroundColor: 'var(--tile-red-bg, #fff1f2)' }}>
                  <p className="flex items-center gap-2 font-semibold" style={{ color: 'var(--auth-danger)' }}>
                    <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />No se creó la convocatoria. {saveError}
                  </p>
                  {saveErrors.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-9 text-sm text-[var(--app-ink)]">
                      {saveErrors.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  )}
                  <p className="mt-2 pl-7 text-xs text-[var(--app-ink-2)]">
                    No se guardó nada a medias: corrige y vuelve a pulsar «Crear convocatoria». Lo capturado sigue en tu borrador.
                  </p>
                </div>
              )}
              {state.convocatoria.fecha_cierre && state.convocatoria.fecha_cierre < new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) && (
                <AlertBox type="warning" message={`La fecha de cierre (${state.convocatoria.fecha_cierre}) ya pasó: la convocatoria se publicará como «Cerrada» y no recibirá solicitudes. Si no es lo que quieres, corrige las fechas en el paso 1.`} />
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
                    {!esEspecie && <p><strong>Apoyo máximo:</strong> ${state.convocatoria.monto_maximo_apoyo.toLocaleString()}</p>}
                    {!esEspecie && <p><strong>Aportación concurrente:</strong> {state.convocatoria.porcentaje_aportacion_minima}%</p>}
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Programa</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><strong>Clave:</strong> {state.programa.clave}</p>
                    <p><strong>Programa:</strong> {state.programa.nombre}{state.programa.programa_nuevo ? ` (nuevo en ${state.programa.sistema.toUpperCase()}: se crea oculto; complétalo en Contenido público)` : ''}</p>
                    <p><strong>Forma del apoyo:</strong> {TIPO_APOYO_LABELS[state.programa.tipo_apoyo] ?? state.programa.tipo_apoyo}</p>
                    {!esEspecie && (<>
                    <p><strong>Monto máximo:</strong> ${state.programa.monto_maximo.toLocaleString()}</p>
                    <p><strong>Etapas:</strong> {state.programa.tiene_etapas ? `Sí (${state.programa.num_etapas})` : 'No'}</p>
                    <p><strong>Equipo:</strong> {state.programa.tiene_equipo ? `Sí (de ${state.programa.min_miembros_equipo} a ${state.programa.max_miembros_equipo} personas)` : 'No'}</p>
                    <p><strong>Calificación mínima para aprobar:</strong> {state.programa.puntaje_minimo_aprobatorio}</p>
                    </>)}
                  </CardContent>
                </Card>

                {esEspecie && (<>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Clubes y kit</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><strong>Kit:</strong> {state.especie.kit_nombre}</p>
                    <p><strong>Integrantes por club:</strong> de {state.especie.min_integrantes} a {state.especie.max_integrantes} (incluye al líder)</p>
                    <p><strong>Clubes por escuela:</strong> {state.especie.clubes_por_escuela === '' ? 'Sin límite' : state.especie.clubes_por_escuela}</p>
                    <p><strong>Menores de edad:</strong> {state.especie.participan_menores ? 'Sí participan' : 'No participan'}</p>
                    <p><strong>Etapas de revisión:</strong> {state.especie.etapas.map((e, i) => `${i + 1}. ${e.nombre} (${REVISA_ETIQUETA[e.revisa].toLowerCase()}, ${e.plazo_horas} h, ${e.max_subsanaciones} corrección${e.max_subsanaciones === 1 ? '' : 'es'})`).join(' · ')}</p>
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Datos que se piden</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1.5">
                    <p className="text-[var(--app-ink)]"><strong>Club:</strong> nombre, escuela, carta de la escuela{Object.entries(CAMPOS_CLUB).filter(([k]) => state.especie.campos_club[k]?.pedir).map(([k, t]) => `, ${t.toLowerCase()}${state.especie.campos_club[k].obligatorio ? '' : ' (opcional)'}`).join('')}</p>
                    <p className="text-[var(--app-ink)]"><strong>Integrante:</strong> nombre{Object.entries(CAMPOS_INTEGRANTE).filter(([k]) => state.especie.campos_integrante[k]?.pedir).map(([k, t]) => `, ${t.toLowerCase()}${state.especie.campos_integrante[k].obligatorio ? '' : ' (opcional)'}`).join('')}</p>
                    {state.especie.campos.map((c, i) => (
                      <p key={i} className="text-[var(--app-ink)] flex items-center gap-2 flex-wrap">{c.etiqueta} <Badge variant="outline">{c.ambito === 'club' ? 'Club' : 'Integrante'} · {TIPO_CAMPO_ETIQUETA[c.tipo_campo]}</Badge></p>
                    ))}
                  </CardContent>
                </Card>
                </>)}

                {!esEspecie && (
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
                )}

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Documentos ({state.documentos.length + (esEspecie ? 1 : 0)})</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1.5">
                    {esEspecie && <p className="text-[var(--app-ink)] flex items-center gap-2 flex-wrap">Carta de consentimiento de la escuela <Badge>Obligatorio</Badge></p>}
                    {state.documentos.map((d, i) => (
                      <p key={i} className="text-[var(--app-ink)] flex items-center gap-2 flex-wrap">{d.nombre} {d.obligatorio && <Badge>Obligatorio</Badge>}</p>
                    ))}
                  </CardContent>
                </Card>

                {!esEspecie && (<>
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
                </>)}
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t border-[var(--app-rule)] px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || saving}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="soft" onClick={guardarYSalir} disabled={saving || estadoBorrador === 'guardando'}>
              <Save className="h-4 w-4" aria-hidden="true" /> Guardar borrador y salir
            </Button>
          </div>

          {currentStep < totalPasos ? (
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
          rubros={esEspecie ? [] : state.rubros}
          criterios={esEspecie ? [] : state.criterios}
          especie={esEspecie ? state.especie : null}
        />
      </div>
    </div>
  );
}
