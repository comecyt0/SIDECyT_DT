'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertBox } from '@/components/ui/alert-box';
import { Save, Send, Loader2, ArrowLeft, AlertCircle, FileText, CheckCircle2, Upload, X } from 'lucide-react';
import { currencySymbol } from '@/lib/format';
import Link from 'next/link';
import api from '@/lib/api';
import { colorMap } from '@/lib/color-mapper';
import { useProgramaCatalog } from '@/hooks/useProgramaCatalog';
import type { AreaConocimiento } from '@/types/api';
import { DynamicFieldRenderer } from '@/components/solicitante/DynamicFieldRenderer';
import { RubrosTable } from '@/components/solicitante/RubrosTable';
import { MiembrosEquipo, type MiembroEquipo } from '@/components/solicitante/MiembrosEquipo';

interface Convocatoria {
  id: number;
  nombre: string;
  ejercicio_fiscal: string;
  tipo_programa?: { id: number; clave: string; nombre: string };
  tipoPrograma?: { id: number; clave: string; nombre: string };
}

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
        const errorMsg = error?.response?.data?.message || error?.message || 'Error desconocido al cargar convocatorias';
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
  const handleConvocatoriaChange = (convId: string | null) => {
    if (!convId) return;

    setFormData({ ...formData, convocatoria_id: convId });

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

  // Check if rubros exceed limit (used to disable buttons)
  const rubrosExceedLimit = (): boolean => {
    if (!programa || rubros.length === 0) return false;
    const total = Object.values(rubroValues).reduce((sum, val) => {
      return sum + (parseFloat(val) || 0);
    }, 0);
    return total > (programa.monto_maximo || 0);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.convocatoria_id) errors.convocatoria = 'Selecciona una convocatoria';
    if (!formData.titulo_proyecto.trim()) errors.titulo = 'El título es obligatorio';
    if (!formData.area_conocimiento_id) errors.area = 'Selecciona un área';
    if (!formData.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria';
    if (!formData.monto_solicitado) errors.monto = 'El monto es obligatorio';
    // Solo validar modalidad si el programa tiene modalidades
    if (modalidades.length > 0 && !modalidadId) errors.modalidad = 'Selecciona una modalidad';

    // Validate dynamic fields
    campos.forEach((campo) => {
      if (campo.requerido && (!dinamicFields[campo.id] || dinamicFields[campo.id] === '')) {
        errors[`campo_${campo.id}`] = `${campo.etiqueta} es obligatorio`;
      }
    });

    // Validate rubros total
    if (rubros.length > 0) {
      const total = Object.values(rubroValues).reduce((sum, val) => {
        return sum + (parseFloat(val) || 0);
      }, 0);
      if (total === 0) {
        errors.rubros = 'Debe distribuir al menos un monto en los rubros';
      } else if (programa?.monto_maximo && total > programa.monto_maximo) {
        errors.rubros = `El total de rubros (${total}) excede el límite (${programa.monto_maximo})`;
      }
    }

    // Validate team members count and details
    if (programa?.tiene_equipo) {
      const minMiembros = programa.min_miembros_equipo || 0;
      const maxMiembros = programa.max_miembros_equipo || 100;

      // Check minimum members required
      if (minMiembros > 0 && miembros.length < minMiembros) {
        errors.miembros_count = `Se requieren mínimo ${minMiembros} miembro(s) de equipo para este programa`;
      }
      // Check maximum members allowed
      if (miembros.length > maxMiembros) {
        errors.miembros_count = `Máximo ${maxMiembros} miembro(s) permitido(s) para este programa`;
      }

      // Validate individual member details
      if (miembros.length > 0) {
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
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent, _submitFinal = false) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

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
            ? `Solicitud creada con ${filesToUpload.length} documento(s) adjunto(s). Redirigiendo...`
            : 'Solicitud creada. Redirigiendo...',
        });
        setTimeout(() => {
          router.push(`/solicitante/solicitudes/${solicitudId}`);
        }, 1500);
      } else {
        setSubmitError({ type: 'success', message: 'Solicitud creada exitosamente.' });
        setTimeout(() => router.push('/solicitante/dashboard'), 2000);
      }
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;
      const technicalError = error.response?.data?.error;
      const statusCode = error.response?.status;

      const errorMsg = serverMessage || 'Error al procesar la solicitud.';
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

      <div className="flex items-center gap-4">
        <Link href="/solicitante/dashboard">
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-dark">Nueva Solicitud</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Completa los campos para registrar un nuevo proyecto o evento.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* CARD 1: Convocatoria */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700 rounded-t-xl pb-4">
            <CardTitle className="text-xl">Selecciona Convocatoria</CardTitle>
            <CardDescription>
              Cada convocatoria corresponde a un programa específico con requisitos únicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {fetchError && (
              <AlertBox
                type="error"
                title="Error al cargar convocatorias"
                message={fetchError}
                details={[
                  'Verifica que tengas conectividad',
                  'Si el error persiste, contacta al administrador'
                ]}
              />
            )}
            <div className="space-y-2">
              <Label htmlFor="convocatoria" className="font-semibold">
                Convocatoria Activa <span className={colorMap.states.error.text}>*</span>
              </Label>
              <Select value={formData.convocatoria_id} onValueChange={handleConvocatoriaChange}>
                <SelectTrigger id="convocatoria" className="h-12 border-neutral-300 dark:border-neutral-600">
                  <SelectValue placeholder="Seleccione una convocatoria" />
                </SelectTrigger>
                <SelectContent>
                  {convocatorias.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No hay convocatorias activas en este momento
                    </SelectItem>
                  ) : (
                    convocatorias.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nombre} ({c.ejercicio_fiscal})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {fieldErrors.convocatoria && (
                <p className={`text-xs ${colorMap.states.error.text}`}>{fieldErrors.convocatoria}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CARD 1B: Documentos Requeridos con upload */}
        {!catalogLoading && documentos.length > 0 && (
          <Card className="border-0 shadow-md border-l-4 border-l-amber-400">
            <CardHeader className="bg-amber-50 border-b border-amber-100 rounded-t-xl pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Documentos Requeridos
              </CardTitle>
              <CardDescription>
                Adjunta los documentos ahora o podrás subirlos después desde el detalle de la solicitud.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-5 space-y-3">
              {documentos.map((doc) => {
                const selectedFile = documentosFiles[doc.clave] || null;
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${selectedFile ? 'text-emerald-500' : doc.obligatorio ? 'text-red-400' : 'text-neutral-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{doc.nombre}</span>
                        {doc.obligatorio && !selectedFile && (
                          <span className="text-xs font-bold text-red-500">Obligatorio</span>
                        )}
                        {selectedFile && (
                          <span className="text-xs font-medium text-emerald-600 truncate max-w-[200px]">
                            ✓ {selectedFile.name}
                          </span>
                        )}
                      </div>
                      {doc.descripcion && !selectedFile && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{doc.descripcion}</p>
                      )}
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        PDF{doc.tamaño_maximo_mb ? ` · máx ${doc.tamaño_maximo_mb}MB` : ' · máx 10MB'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedFile && (
                        <button
                          type="button"
                          className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-red-500 transition-colors"
                          onClick={() => setDocumentosFiles(prev => ({ ...prev, [doc.clave]: null }))}
                          title="Quitar archivo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <input
                        ref={el => { fileInputRefs.current[doc.clave] = el; }}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setDocumentosFiles(prev => ({ ...prev, [doc.clave]: file }));
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => fileInputRefs.current[doc.clave]?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {selectedFile ? 'Cambiar' : 'Subir PDF'}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {uploadProgress && (
                <div className="flex items-center gap-2 text-sm text-primary mt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CARD 2: Datos Generales */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700 rounded-t-xl pb-4">
            <CardTitle className="text-xl">Datos Generales del Proyecto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="titulo" className="font-semibold">
                Título del Proyecto/Evento <span className={colorMap.states.error.text}>*</span>
              </Label>
              <Input
                id="titulo"
                placeholder="Ej. Congreso Internacional de IA..."
                className="h-12 border-neutral-300 dark:border-neutral-600"
                value={formData.titulo_proyecto}
                onChange={(e) => setFormData({ ...formData, titulo_proyecto: e.target.value })}
              />
              {fieldErrors.titulo && (
                <p className={`text-xs ${colorMap.states.error.text}`}>{fieldErrors.titulo}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="area" className="font-semibold">
                  Área de Conocimiento <span className={colorMap.states.error.text}>*</span>
                </Label>
                <Select
                  value={formData.area_conocimiento_id}
                  onValueChange={(val) =>
                    setFormData({ ...formData, area_conocimiento_id: val || '' })
                  }
                >
                  <SelectTrigger id="area" className="h-12 border-neutral-300 dark:border-neutral-600">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {areasConocimiento.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No se encontraron áreas en la BD
                      </SelectItem>
                    ) : (
                      areasConocimiento.map((a) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {fieldErrors.area && <p className={`text-xs ${colorMap.states.error.text}`}>{fieldErrors.area}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto" className="font-semibold">
                  Monto Solicitado <span className={colorMap.states.error.text}>*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-neutral-500 dark:text-neutral-400">{currencySymbol()}</span>
                  <Input
                    id="monto"
                    type="number"
                    min="1"
                    placeholder="0.00"
                    className="h-12 pl-8 border-neutral-300 dark:border-neutral-600"
                    value={formData.monto_solicitado}
                    onChange={(e) =>
                      setFormData({ ...formData, monto_solicitado: e.target.value })
                    }
                  />
                </div>
                {fieldErrors.monto && (
                  <p className={`text-xs ${colorMap.states.error.text}`}>{fieldErrors.monto}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-semibold">
                Resumen Ejecutivo <span className={colorMap.states.error.text}>*</span>
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Describe brevemente los objetivos, metodología e impacto..."
                className="min-h-[150px] resize-y border-neutral-300 dark:border-neutral-600"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
              <div className="flex justify-between">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formData.descripcion.length} / 2000 caracteres
                </p>
                {fieldErrors.descripcion && (
                  <p className={`text-xs ${colorMap.states.error.text}`}>{fieldErrors.descripcion}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: Modalidades (Dinámicas) */}
        {!catalogLoading && !catalogError && modalidades.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700 rounded-t-xl pb-4">
              <CardTitle className="text-xl">Modalidad del Programa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="program-modalidad" className="font-semibold">
                  Selecciona Modalidad <span className={colorMap.states.error.text}>*</span>
                </Label>
                <Select value={modalidadId} onValueChange={(val) => val && setModalidadId(val)}>
                  <SelectTrigger id="program-modalidad" className="h-12 border-neutral-300 dark:border-neutral-600">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modalidades.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CARD 4: Campos Dinámicos */}
        {catalogLoading ? (
          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : catalogError ? (
          <Card className={`border-0 shadow-md ${colorMap.states.error.border} ${colorMap.states.error.background}`}>
            <CardContent className="flex items-start gap-4 py-6">
              <AlertCircle className={`h-5 w-5 ${colorMap.states.error.text} mt-0.5 shrink-0`} />
              <div>
                <p className={`font-semibold text-red-900`}>Error al cargar catálogo</p>
                <p className={`text-sm ${colorMap.states.error.main}`}>{catalogError}</p>
              </div>
            </CardContent>
          </Card>
        ) : campos.length > 0 ? (
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700 rounded-t-xl pb-4">
              <CardTitle className="text-xl">Campos Específicos del Programa</CardTitle>
              {programa?.tiene_etapas && (
                <CardDescription>Los campos están agrupados por etapa del proyecto.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              {programa?.tiene_etapas ? (
                // Agrupar por etapa
                [1, 2].map((etapaNum) => {
                  const fieldsPorEtapa = campos.filter((c) => {
                    // Si tiene etapa_id, filtra por esa; si no, asume etapa 1
                    return !c.etapa_id || c.etapa_id === etapaNum;
                  });
                  if (fieldsPorEtapa.length === 0) return null;

                  return (
                    <div key={`etapa-${etapaNum}`} className="space-y-4">
                      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
                        Etapa {etapaNum}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {fieldsPorEtapa.map((campo) => (
                          <DynamicFieldRenderer
                            key={campo.id}
                            campo={campo}
                            value={dinamicFields[campo.id] || ''}
                            onChange={(val) =>
                              setDinamicFields({ ...dinamicFields, [campo.id]: val })
                            }
                            error={fieldErrors[`campo_${campo.id}`]}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Sin agrupar por etapa
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {campos.map((campo) => (
                    <DynamicFieldRenderer
                      key={campo.id}
                      campo={campo}
                      value={dinamicFields[campo.id] || ''}
                      onChange={(val) => setDinamicFields({ ...dinamicFields, [campo.id]: val })}
                      error={fieldErrors[`campo_${campo.id}`]}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* CARD 5: Rubros Presupuestarios */}
        {!catalogLoading && !catalogError && rubros.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700 rounded-t-xl pb-4">
              <CardTitle className="text-xl">Distribución Presupuestaria</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <RubrosTable
                rubros={rubros}
                values={rubroValues}
                montoMaximo={programa?.monto_maximo || null}
                onChange={(rubroId, monto) =>
                  setRubroValues({ ...rubroValues, [rubroId]: monto })
                }
              />
              {fieldErrors.rubros && (
                <p className={`text-xs ${colorMap.states.error.text} mt-4`}>{fieldErrors.rubros}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* CARD 6: Miembros de Equipo */}
        {!catalogLoading && !catalogError && programa?.tiene_equipo && (
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700 rounded-t-xl pb-4">
              <CardTitle className="text-xl">Equipo de Trabajo</CardTitle>
              <CardDescription>
                Mínimo {programa.min_miembros_equipo || 1}
                {programa.max_miembros_equipo ? ` - ${programa.max_miembros_equipo}` : ''}{' '}
                miembros
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <MiembrosEquipo
                miembros={miembros}
                minMiembros={programa.min_miembros_equipo || 1}
                maxMiembros={programa.max_miembros_equipo || null}
                edadMin={programa.rango_edad_min}
                edadMax={programa.rango_edad_max}
                onChange={setMiembros}
              />
              {fieldErrors.miembros_count && (
                <p className={`text-sm ${colorMap.states.error.text} mt-4 font-medium`}>{fieldErrors.miembros_count}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Buttons */}
        <div className="space-y-3">
          {rubrosExceedLimit() && (
            <div className={`p-3 ${colorMap.states.error.background} border ${colorMap.states.error.border} rounded-lg`}>
              <p className={`text-sm ${colorMap.states.error.text}`}>
                <AlertCircle className="inline h-4 w-4 mr-2" />
                Los rubros exceden el presupuesto máximo. Revisa la distribución antes de enviar.
              </p>
            </div>
          )}
          <div className="p-6 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.back()}
              className="h-11"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-light h-11 shadow-sm"
              disabled={loading || rubrosExceedLimit()}
              title={rubrosExceedLimit() ? 'Los rubros exceden el límite presupuestario' : ''}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Guardar Borrador
                </>
              )}
            </Button>
            <Button
              type="button"
              className="bg-accent hover:bg-accent/90 text-accent-foreground h-11 shadow-md"
              disabled={loading || rubrosExceedLimit()}
              onClick={() => handleSubmit(undefined, true)}
              title={rubrosExceedLimit() ? 'Los rubros exceden el límite presupuestario' : 'Crear solicitud e ir a subir documentos'}
            >
              <Send className="mr-2 h-4 w-4" /> Crear e Ir a Documentos
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
