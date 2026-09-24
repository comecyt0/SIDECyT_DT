'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertBox } from '@/components/ui/alert-box';
import PageHeader from '@/components/ui/page-header';
import StepFrame, { type StepDef } from '@/components/ui/step-frame';
import { Loader2, AlertCircle, FileText, CheckCircle2, Upload, X, FilePlus2 } from 'lucide-react';
import { currencySymbol, formatCurrency } from '@/lib/format';
import api from '@/lib/api';
import { useProgramaCatalog } from '@/hooks/useProgramaCatalog';
import type { AreaConocimiento } from '@/types/api';
import { DynamicFieldRenderer } from '@/components/solicitante/DynamicFieldRenderer';
import { RubrosTable } from '@/components/solicitante/RubrosTable';
import { MiembrosEquipo, type MiembroEquipo } from '@/components/solicitante/MiembrosEquipo';
import { acceptDe, describirLimites, formatosDe, validarArchivo } from '@/lib/archivos';

interface Convocatoria {
  id: number;
  nombre: string;
  ejercicio_fiscal: string;
  tipo_programa?: { id: number; clave: string; nombre: string };
  tipoPrograma?: { id: number; clave: string; nombre: string };
}

const labelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const inputCls = 'auth-input auth-input-static pl-4';

export default function NuevaSolicitud() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [areasConocimiento, setAreasConocimiento] = useState<AreaConocimiento[]>([]);

  // Dynamic form state
  const [tipoProgramaId, setTipoProgramaId] = useState<number | null>(null);
  const [dinamicFields, setDinamicFields] = useState<Record<string, string | number>>({});
  const [modalidadId, setModalidadId] = useState('');
  const [rubroValues, setRubroValues] = useState<Record<number, string>>({});
  const [miembros, setMiembros] = useState<MiembroEquipo[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<{
    type: 'error' | 'warning' | 'success' | 'info';
    message: string;
    details?: string[];
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [documentosFiles, setDocumentosFiles] = useState<Record<string, File | null>>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Base form data (always required)
  const [formData, setFormData] = useState({
    convocatoria_id: '',
    titulo_proyecto: '',
    area_conocimiento_id: '',
    descripcion: '',
    monto_solicitado: '',
  });

  // Fetch catalog data
  const { programa, campos, rubros, modalidades, documentos, loading: catalogLoading, error: catalogError } =
    useProgramaCatalog(tipoProgramaId);

  // Initialize convocatorias and areas
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [convRes, catRes] = await Promise.all([
          api.get('/solicitudes/convocatorias-activas'),
          api.get('/catalogos'),
        ]);
        // API devuelve array directo o array dentro de .data
        const convItems = Array.isArray(convRes.data) ? convRes.data : [];
        const areaItems = Array.isArray(catRes.data?.areas_conocimiento)
          ? catRes.data.areas_conocimiento
          : [];
        setConvocatorias(convItems);
        setAreasConocimiento(areaItems);
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || 'No se pudieron cargar las convocatorias';
        console.error('Error al cargar datos:', {
          status: error?.response?.status,
          message: errorMsg,
          fullError: error?.response?.data || error
        });
        setFetchError(errorMsg);
        setConvocatorias([]);
        setAreasConocimiento([]);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Handle convocatoria selection → derive programa and reset dynamic state
  const handleConvocatoriaChange = (convId: string) => {
    setFormData({ ...formData, convocatoria_id: convId });
    if (!convId) return;

    const selected = convocatorias.find((c) => c.id.toString() === convId);
    const tipoProgramaData = selected?.tipo_programa || selected?.tipoPrograma;
    if (tipoProgramaData?.id) {
      setTipoProgramaId(tipoProgramaData.id);
      // Reset all dynamic fields
      setDinamicFields({});
      setRubroValues({});
      setModalidadId('');
      setMiembros(
        tipoProgramaData.nombre === 'Jóvenes Emprendedores e Innovadores'
          ? [{ nombre: '', edad: null, rol: '', email: null }]
          : []
      );
      setFieldErrors({});
      setDocumentosFiles({});
    }
  };

  const rubrosTotal = () => Object.values(rubroValues).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  // Check if rubros exceed limit (used to disable buttons)
  const rubrosExceedLimit = (): boolean => {
    if (!programa || rubros.length === 0) return false;
    return rubrosTotal() > (programa.monto_maximo || 0);
  };

  // ── Validación por bloque: cada paso revisa solo lo suyo y deja el mensaje en pantalla ──
  const validateConvocatoria = (): Record<string, string> =>
    !formData.convocatoria_id ? { convocatoria: 'Selecciona una convocatoria' } : {};

  const validateBasics = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.titulo_proyecto.trim()) errors.titulo = 'El título es obligatorio';
    if (!formData.area_conocimiento_id) errors.area = 'Selecciona un área';
    if (!formData.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria';
    if (!formData.monto_solicitado || Number(formData.monto_solicitado) <= 0) errors.monto = 'El monto es obligatorio';
    return errors;
  };

  const validateModalidad = (): Record<string, string> =>
    modalidades.length > 0 && !modalidadId ? { modalidad: 'Selecciona una modalidad' } : {};

  const validateCampos = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    campos.forEach((campo) => {
      if (campo.requerido && (!dinamicFields[campo.id] || dinamicFields[campo.id] === '')) {
        errors[`campo_${campo.id}`] = `${campo.etiqueta} es obligatorio`;
      }
    });
    return errors;
  };

  const validateRubros = (): Record<string, string> => {
    if (rubros.length === 0) return {};
    const total = rubrosTotal();
    if (total === 0) return { rubros: 'Reparte el monto entre al menos un concepto de gasto' };
    if (programa?.monto_maximo && total > programa.monto_maximo) {
      return { rubros: `Lo repartido (${formatCurrency(total)}) supera el máximo del programa (${formatCurrency(programa.monto_maximo)})` };
    }
    return {};
  };

  const validateEquipo = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!programa?.tiene_equipo) return errors;
    const minMiembros = programa.min_miembros_equipo || 0;
    const maxMiembros = programa.max_miembros_equipo || 100;
    if (minMiembros > 0 && miembros.length < minMiembros) {
      errors.miembros_count = `Este programa pide al menos ${minMiembros} integrante(s)`;
    }
    if (miembros.length > maxMiembros) {
      errors.miembros_count = `Este programa admite máximo ${maxMiembros} integrante(s)`;
    }
    miembros.forEach((m, i) => {
      if (!m.nombre.trim()) errors[`miembro_${i}_nombre`] = 'Nombre requerido';
      if (!m.rol.trim()) errors[`miembro_${i}_rol`] = 'Rol requerido';
      if (programa.rango_edad_min && m.edad && m.edad < programa.rango_edad_min) {
        errors[`miembro_${i}_edad`] = `Edad mínima: ${programa.rango_edad_min}`;
      }
      if (programa.rango_edad_max && m.edad && m.edad > programa.rango_edad_max) {
        errors[`miembro_${i}_edad`] = `Edad máxima: ${programa.rango_edad_max}`;
      }
    });
    return errors;
  };

  const validateForm = (): Record<string, string> => ({
    ...validateConvocatoria(),
    ...validateBasics(),
    ...validateModalidad(),
    ...validateCampos(),
    ...validateRubros(),
    ...validateEquipo(),
  });

  /** Envuelve un validador de bloque para StepFrame: guarda los errores y devuelve el primero. */
  const stepValidate = (fn: () => Record<string, string>) => () => {
    const errors = fn();
    setFieldErrors(errors);
    return Object.values(errors)[0] ?? null;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitError({ type: 'error', message: 'Faltan datos por completar. Regresa al paso indicado.', details: Object.values(errors) });
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      // Obtener nombre de la modalidad seleccionada, si existe
      const modalidadNombre = modalidadId
        ? modalidades.find(m => m.id.toString() === modalidadId)?.nombre
        : null;

      const payload = {
        ...formData,
        monto_solicitado: formData.monto_solicitado ? Number(formData.monto_solicitado) : 0,
        modalidad: modalidadNombre || null, // Enviar nombre de modalidad, no ID
        campos_dinamicos: campos.map((campo) => ({
          campo_id: campo.id,
          valor: dinamicFields[campo.id] || '',
        })),
        rubros: rubros.map((rubro) => ({
          rubro_id: rubro.id,
          monto: parseFloat(rubroValues[rubro.id] || '0') || 0,
        })),
        miembros_equipo: programa?.tiene_equipo ? miembros : [],
      };

      const res = await api.post('/solicitudes', payload);
      const solicitudId = res.data?.solicitud?.id || res.data?.id;

      // Upload any attached documents
      const filesToUpload = Object.entries(documentosFiles).filter(([, file]) => file !== null);
      if (solicitudId && filesToUpload.length > 0) {
        for (const [clave, file] of filesToUpload) {
          if (!file) continue;
          setUploadProgress(`Subiendo ${file.name}...`);
          const formData = new FormData();
          formData.append('file', file);
          formData.append('tipo', clave);
          await api.post(`/solicitudes/${solicitudId}/documentos`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        setUploadProgress(null);
      }

      if (solicitudId) {
        setSubmitError({
          type: 'success',
          message: filesToUpload.length > 0
            ? `Solicitud guardada con ${filesToUpload.length} documento(s). Abriendo tu solicitud…`
            : 'Solicitud guardada. Abriendo tu solicitud…',
        });
        setTimeout(() => {
          router.push(`/solicitante/solicitudes/${solicitudId}`);
        }, 1500);
      } else {
        setSubmitError({ type: 'success', message: 'Solicitud guardada.' });
        setTimeout(() => router.push('/solicitante/dashboard'), 2000);
      }
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;
      const technicalError = error.response?.data?.error;
      const statusCode = error.response?.status;

      const errorMsg = serverMessage || 'No se pudo guardar la solicitud.';
      let errorDetails: string[] = [];

      if (statusCode === 422 && validationErrors) {
        // Parse validation errors
        errorDetails = Object.entries(validationErrors)
          .flatMap(([, msgs]: any) => {
            return Array.isArray(msgs) ? msgs : [msgs];
          });
      } else if (technicalError) {
        errorDetails = [technicalError];
      }

      setSubmitError({
        type: 'error',
        message: errorMsg,
        details: errorDetails.length > 0 ? errorDetails : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const errText = (key: string) =>
    fieldErrors[key] ? <p className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{fieldErrors[key]}</p> : null;

  const selectedConvocatoria = convocatorias.find((c) => c.id.toString() === formData.convocatoria_id);
  const selectedArea = areasConocimiento.find((a) => a.id.toString() === formData.area_conocimiento_id);
  const attachedCount = Object.values(documentosFiles).filter(Boolean).length;

  // ── Pasos (los del programa solo aparecen cuando el catálogo los trae) ──
  const steps: StepDef[] = [
    {
      key: 'convocatoria',
      label: 'La convocatoria',
      question: '¿A qué convocatoria aplicas?',
      validate: stepValidate(validateConvocatoria),
      content: (
        <>
          {fetchError && (
            <AlertBox
              type="error"
              title="No se pudieron cargar las convocatorias"
              message={fetchError}
              details={['Revisa tu conexión a internet.', 'Si sigue igual, avisa al administrador.']}
            />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="convocatoria" className={labelCls}>Convocatoria *</Label>
            <select
              id="convocatoria"
              value={formData.convocatoria_id}
              onChange={(e) => handleConvocatoriaChange(e.target.value)}
              className={inputCls}
              aria-invalid={fieldErrors.convocatoria ? 'true' : undefined}
            >
              <option value="">{convocatorias.length === 0 ? 'No hay convocatorias abiertas ahora' : 'Elige una convocatoria…'}</option>
              {convocatorias.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.nombre} ({c.ejercicio_fiscal})
                </option>
              ))}
            </select>
            {errText('convocatoria')}
            <p className="text-xs text-[var(--app-ink-2)]">Cada convocatoria pertenece a un programa con sus propias preguntas y documentos; los verás en los siguientes pasos.</p>
          </div>
          {catalogLoading && (
            <p className="inline-flex items-center gap-2 text-sm text-[var(--app-ink-2)]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Preparando el formulario del programa…</p>
          )}
        </>
      ),
    },
    {
      key: 'proyecto',
      label: 'Tu proyecto',
      question: '¿De qué trata tu proyecto?',
      validate: stepValidate(validateBasics),
      content: (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="titulo" className={labelCls}>Título del proyecto *</Label>
            <input
              id="titulo"
              placeholder="Ej. Congreso Internacional de Inteligencia Artificial"
              className={inputCls}
              value={formData.titulo_proyecto}
              onChange={(e) => setFormData({ ...formData, titulo_proyecto: e.target.value })}
              aria-invalid={fieldErrors.titulo ? 'true' : undefined}
            />
            {errText('titulo')}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="area" className={labelCls}>Área de conocimiento *</Label>
              <select
                id="area"
                value={formData.area_conocimiento_id}
                onChange={(e) => setFormData({ ...formData, area_conocimiento_id: e.target.value })}
                className={inputCls}
                aria-invalid={fieldErrors.area ? 'true' : undefined}
              >
                <option value="">{areasConocimiento.length === 0 ? 'Sin áreas disponibles' : 'Elige un área…'}</option>
                {areasConocimiento.map((a) => (
                  <option key={a.id} value={a.id.toString()}>{a.nombre}</option>
                ))}
              </select>
              {errText('area')}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monto" className={labelCls}>Monto que solicitas *</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--app-ink-2)]" aria-hidden="true">{currencySymbol()}</span>
                <input
                  id="monto"
                  type="number"
                  min="1"
                  placeholder="0.00"
                  className={`${inputCls} !pl-9`}
                  value={formData.monto_solicitado}
                  onChange={(e) => setFormData({ ...formData, monto_solicitado: e.target.value })}
                  aria-invalid={fieldErrors.monto ? 'true' : undefined}
                />
              </div>
              {errText('monto')}
              {programa?.monto_maximo ? (
                <p className="text-xs text-[var(--app-ink-2)]">Este programa apoya hasta {formatCurrency(programa.monto_maximo)} por proyecto.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion" className={labelCls}>Resumen del proyecto *</Label>
            <textarea
              id="descripcion"
              placeholder="En pocas líneas: qué quieres lograr, cómo y a quién beneficia."
              className={`${inputCls} !h-auto min-h-[150px] py-3 resize-y`}
              maxLength={2000}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              aria-invalid={fieldErrors.descripcion ? 'true' : undefined}
            />
            <div className="flex justify-between gap-3">
              <p className="text-xs text-[var(--app-ink-2)]">{formData.descripcion.length} / 2000 caracteres</p>
              {errText('descripcion')}
            </div>
          </div>
        </>
      ),
    },
  ];

  if (!catalogLoading && !catalogError && modalidades.length > 0) {
    steps.push({
      key: 'modalidad',
      label: 'Modalidad',
      question: '¿En qué modalidad participas?',
      validate: stepValidate(validateModalidad),
      content: (
        <div className="space-y-1.5">
          <Label htmlFor="program-modalidad" className={labelCls}>Modalidad *</Label>
          <select id="program-modalidad" value={modalidadId} onChange={(e) => setModalidadId(e.target.value)} className={inputCls}>
            <option value="">Elige una modalidad…</option>
            {modalidades.map((m) => (
              <option key={m.id} value={m.id.toString()}>{m.nombre}</option>
            ))}
          </select>
          {errText('modalidad')}
        </div>
      ),
    });
  }

  if (catalogError) {
    steps.push({
      key: 'catalogo-error',
      label: 'Datos del programa',
      question: 'No pudimos cargar las preguntas del programa',
      content: (
        <div className="flex items-start gap-3 rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-danger)' }}>
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Inténtalo de nuevo en un momento.</p>
            <p>{catalogError}</p>
          </div>
        </div>
      ),
    });
  } else if (!catalogLoading && campos.length > 0) {
    const renderCampos = (list: typeof campos) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {list.map((campo) => (
          <DynamicFieldRenderer
            key={campo.id}
            campo={campo}
            value={dinamicFields[campo.id] || ''}
            onChange={(val) => setDinamicFields({ ...dinamicFields, [campo.id]: val })}
            error={fieldErrors[`campo_${campo.id}`]}
          />
        ))}
      </div>
    );
    steps.push({
      key: 'campos',
      label: 'Datos del programa',
      question: 'Cuéntanos lo que este programa necesita saber',
      validate: stepValidate(validateCampos),
      content: programa?.tiene_etapas ? (
        <div className="space-y-6">
          {[1, 2].map((etapaNum) => {
            const fieldsPorEtapa = campos.filter((c) => !c.etapa_id || c.etapa_id === etapaNum);
            if (fieldsPorEtapa.length === 0) return null;
            return (
              <div key={`etapa-${etapaNum}`} className="space-y-3">
                <h4 className="text-sm font-bold text-[var(--app-ink)]">Etapa {etapaNum}</h4>
                {renderCampos(fieldsPorEtapa)}
              </div>
            );
          })}
        </div>
      ) : renderCampos(campos),
    });
  }

  if (!catalogLoading && !catalogError && rubros.length > 0) {
    steps.push({
      key: 'presupuesto',
      label: 'Presupuesto',
      question: '¿Cómo repartes el dinero?',
      validate: stepValidate(validateRubros),
      content: (
        <>
          <RubrosTable
            rubros={rubros}
            values={rubroValues}
            montoMaximo={programa?.monto_maximo || null}
            onChange={(rubroId, monto) => setRubroValues({ ...rubroValues, [rubroId]: monto })}
          />
          {errText('rubros')}
          {rubrosExceedLimit() && (
            <p className="flex items-center gap-2 rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-danger)' }}>
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Lo repartido supera el máximo del programa. Ajusta las cantidades antes de continuar.
            </p>
          )}
        </>
      ),
    });
  }

  if (!catalogLoading && !catalogError && programa?.tiene_equipo) {
    steps.push({
      key: 'equipo',
      label: 'Equipo',
      question: '¿Quiénes participan contigo?',
      validate: stepValidate(validateEquipo),
      content: (
        <>
          <p className="text-sm text-[var(--app-ink-2)]">
            Este programa pide entre {programa.min_miembros_equipo || 1}{programa.max_miembros_equipo ? ` y ${programa.max_miembros_equipo}` : ''} integrantes.
          </p>
          <MiembrosEquipo
            miembros={miembros}
            minMiembros={programa.min_miembros_equipo || 1}
            maxMiembros={programa.max_miembros_equipo || null}
            edadMin={programa.rango_edad_min}
            edadMax={programa.rango_edad_max}
            onChange={setMiembros}
          />
          {errText('miembros_count')}
        </>
      ),
    });
  }

  if (!catalogLoading && documentos.length > 0) {
    steps.push({
      key: 'documentos',
      label: 'Documentos',
      question: '¿Tienes los documentos a la mano?',
      content: (
        <>
          <p className="text-sm text-[var(--app-ink-2)]">Puedes adjuntarlos ahora o después, desde tu solicitud. Solo PDF.</p>
          <div className="space-y-2">
            {documentos.map((doc) => {
              const selectedFile = documentosFiles[doc.clave] || null;
              return (
                <div key={doc.id} className="flex items-center gap-3 rounded-[14px] border px-4 py-3" style={{ borderColor: 'var(--app-rule)', backgroundColor: selectedFile ? 'var(--tile-emerald-bg)' : 'var(--auth-field)' }}>
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" style={{ color: selectedFile ? 'var(--tile-emerald-fg)' : doc.obligatorio ? 'var(--auth-danger)' : 'var(--app-ink-2)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--app-ink)]">{doc.nombre}</span>
                      {doc.obligatorio && !selectedFile && (
                        <span className="text-xs font-bold" style={{ color: 'var(--auth-danger)' }}>Obligatorio</span>
                      )}
                      {selectedFile && (
                        <span className="text-xs font-medium truncate max-w-[200px]" style={{ color: 'var(--tile-emerald-fg)' }}>{selectedFile.name}</span>
                      )}
                    </div>
                    {doc.descripcion && !selectedFile && (
                      <p className="text-xs text-[var(--app-ink-2)] mt-0.5">{doc.descripcion}</p>
                    )}
                    <p className="text-xs text-[var(--app-ink-2)]">
                      {describirLimites(formatosDe(doc.formato_permitido), Number(doc.tamaño_maximo_mb ?? 5) || 5)}
                    </p>
                    {fieldErrors[`doc_${doc.clave}`] && (
                      <p role="alert" className="text-xs font-semibold" style={{ color: 'var(--auth-danger)' }}>{fieldErrors[`doc_${doc.clave}`]}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedFile && (
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar archivo" title="Quitar archivo" onClick={() => setDocumentosFiles(prev => ({ ...prev, [doc.clave]: null }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <input
                      ref={el => { fileInputRefs.current[doc.clave] = el; }}
                      type="file"
                      accept={acceptDe(formatosDe(doc.formato_permitido))}
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        e.target.value = '';
                        // E45: límites del documento definidos por el admin (el servidor revisa el contenido real).
                        const problema = file ? validarArchivo(file, formatosDe(doc.formato_permitido), Number(doc.tamaño_maximo_mb ?? 5) || 5) : null;
                        setFieldErrors(prev => {
                          const n = { ...prev };
                          if (problema) n[`doc_${doc.clave}`] = problema; else delete n[`doc_${doc.clave}`];
                          return n;
                        });
                        if (problema) return;
                        setDocumentosFiles(prev => ({ ...prev, [doc.clave]: file }));
                      }}
                    />
                    <Button type="button" variant="soft" size="sm" className="gap-1.5" onClick={() => fileInputRefs.current[doc.clave]?.click()}>
                      <Upload className="h-3.5 w-3.5" />
                      {selectedFile ? 'Cambiar' : 'Adjuntar'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ),
    });
  }

  steps.push({
    key: 'revisar',
    label: 'Revisar y guardar',
    question: '¿Todo en orden?',
    content: (
      <>
        <p className="text-sm text-[var(--app-ink-2)]">Se guarda como <strong>borrador</strong>: podrás completarla y enviarla a revisión desde tu solicitud.</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ['Convocatoria', selectedConvocatoria ? `${selectedConvocatoria.nombre} (${selectedConvocatoria.ejercicio_fiscal})` : '—'],
            ['Título', formData.titulo_proyecto || '—'],
            ['Área', selectedArea?.nombre || '—'],
            ['Monto', formData.monto_solicitado ? formatCurrency(Number(formData.monto_solicitado)) : '—'],
            ...(modalidades.length > 0 ? [['Modalidad', modalidades.find(m => m.id.toString() === modalidadId)?.nombre || '—']] : []),
            ...(rubros.length > 0 ? [['Presupuesto repartido', formatCurrency(rubrosTotal())]] : []),
            ...(programa?.tiene_equipo ? [['Integrantes', String(miembros.length)]] : []),
            ...(documentos.length > 0 ? [['Documentos adjuntos', `${attachedCount} de ${documentos.length}`]] : []),
          ].map(([k, v]) => (
            <div key={k} className="rounded-[14px] px-4 py-3" style={{ background: 'var(--auth-field)' }}>
              <dt className="text-[11px] font-bold uppercase tracking-widest text-[var(--app-ink-2)]">{k}</dt>
              <dd className="font-semibold text-[var(--app-ink)] mt-0.5 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        {uploadProgress && (
          <p className="inline-flex items-center gap-2 text-sm text-[var(--app-ink-2)]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {uploadProgress}</p>
        )}
      </>
    ),
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      {submitError && (
        <AlertBox
          type={submitError.type}
          message={submitError.message}
          details={submitError.details}
          onClose={() => setSubmitError(null)}
        />
      )}

      <PageHeader
        backHref="/solicitante/dashboard"
        backLabel="Volver al inicio"
        eyebrow="Solicitudes"
        title="Nueva solicitud"
        description="Paso a paso, con lo que este programa necesita saber de tu proyecto."
      />

      <StepFrame
        inline
        title="Registrar un proyecto"
        icon={<FilePlus2 className="h-5 w-5" />}
        intro={<>Nada se envía todavía: al terminar se guarda como <strong>borrador</strong> y {`podrás revisarlo con calma. Los pasos cambian según la convocatoria que elijas.`}</>}
        steps={steps}
        onClose={() => router.back()}
        onSubmit={handleSubmit}
        submitting={loading}
        submitLabel="Guardar solicitud"
      />

      {documentos.length === 0 && !catalogLoading && formData.convocatoria_id && (
        <p className="inline-flex items-center gap-2 text-xs text-[var(--app-ink-2)] px-1">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Esta convocatoria no pide documentos al registrar; si hacen falta, los subirás desde tu solicitud.
        </p>
      )}
    </div>
  );
}
