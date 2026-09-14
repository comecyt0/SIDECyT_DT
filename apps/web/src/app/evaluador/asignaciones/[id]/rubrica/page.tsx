'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, Loader2, Send,
  Brain, FlaskConical, Globe2, CheckSquare,
  Building2, FileText
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { colorMap } from '@/lib/color-mapper';
import type { AsignacionEvaluador } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { INSTITUTION } from '@/lib/institution';

const LEGACY_CRITERIOS = [
  {
    key: 'criterio_1_puntaje',
    label: 'Relevancia Científica / Tecnológica',
    description: `Impacto y pertinencia del proyecto para el desarrollo científico y tecnológico del ${INSTITUTION.state}.`,
    icon: Brain,
    colorState: 'primary' as const,
    maxPuntaje: 25,
  },
  {
    key: 'criterio_2_puntaje',
    label: 'Metodología',
    description: 'Claridad, rigor metodológico y coherencia del diseño de investigación propuesto.',
    icon: FlaskConical,
    colorState: 'info' as const,
    maxPuntaje: 25,
  },
  {
    key: 'criterio_3_puntaje',
    label: 'Impacto Regional',
    description: `Beneficio esperado para la comunidad científica, productiva o social del ${INSTITUTION.state}.`,
    icon: Globe2,
    colorState: 'success' as const,
    maxPuntaje: 25,
  },
  {
    key: 'criterio_4_puntaje',
    label: 'Viabilidad',
    description: 'Factibilidad técnica, temporal y financiera del proyecto dentro del período de apoyo.',
    icon: CheckSquare,
    colorState: 'warning' as const,
    maxPuntaje: 25,
  },
];

interface DynamicCriterio {
  id: number;
  nombre: string;
  descripcion?: string;
  puntaje_maximo: number | string; // API returns string ("100.00"), always cast with Number()
  peso?: number;
}

// Helper functions for color mapping
const getCriterioColors = (colorState: 'primary' | 'info' | 'success' | 'warning') => {
  const colorMap_states = {
    primary: { text: colorMap.primary.text, bg: colorMap.primary.background, border: colorMap.primary.border, fill: colorMap.primary.text },
    info: { text: colorMap.states.info.text, bg: colorMap.states.info.background, border: colorMap.states.info.border, fill: colorMap.states.info.text },
    success: { text: colorMap.states.success.text, bg: colorMap.states.success.background, border: colorMap.states.success.border, fill: colorMap.states.success.text },
    warning: { text: colorMap.states.warning.text, bg: colorMap.states.warning.background, border: colorMap.states.warning.border, fill: colorMap.states.warning.text },
  };
  return colorMap_states[colorState];
};

const getAccentColor = (percentage: number) => {
  if (percentage >= 80) return '#16a34a'; // Success
  if (percentage >= 50) return '#d97706'; // Warning
  return '#dc2626'; // Error
};

const DYNAMIC_COLOR_PALETTE = [
  { text: colorMap.primary.text, bg: colorMap.primary.background, border: colorMap.primary.border, fill: colorMap.primary.text },
  { text: colorMap.states.info.text, bg: colorMap.states.info.background, border: colorMap.states.info.border, fill: colorMap.states.info.text },
  { text: colorMap.states.success.text, bg: colorMap.states.success.background, border: colorMap.states.success.border, fill: colorMap.states.success.text },
  { text: colorMap.states.warning.text, bg: colorMap.states.warning.background, border: colorMap.states.warning.border, fill: colorMap.states.warning.text },
  { text: colorMap.states.error.text, bg: colorMap.states.error.background, border: colorMap.states.error.border, fill: colorMap.states.error.text },
];

export default function RubricaEvaluacionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asignacion, setAsignacion] = useState<AsignacionEvaluador | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic evaluation state
  const [isDynamic, setIsDynamic] = useState(false);
  const [criteriosDinamicos, setCriteriosDinamicos] = useState<DynamicCriterio[]>([]);
  const [puntajeMinimo] = useState(80);

  // Scores: legacy → { criterio_1_puntaje: n, ... }; dynamic → { [criterio_id]: n }
  const [scores, setScores] = useState<Record<string, number>>({});

  const [comentarios_justificacion, setComentarios] = useState('');
  const [evalError, setEvalError] = useState<string | null>(null);
  const [cartaImparcialidadAceptada, setCartaImparcialidad] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; description: string; onConfirm: () => void}>({
    open: false, title: '', description: '', onConfirm: () => {}
  });

  useEffect(() => {
    api.get(`/evaluador/asignaciones/${id}`)
      .then(({ data }) => {
        setAsignacion(data);

        // Cambiar estado a 'evaluando' si está en 'asignado'
        if (data.estado === 'asignado') {
          api.put(`/evaluador/asignaciones/${id}/iniciar-evaluacion`)
            .catch(() => console.warn('No se pudo cambiar el estado a evaluando'));
        }

        // Determine if dynamic evaluation
        // Laravel serializes relationships as snake_case (tipo_programa), not camelCase
        const tipoPrograma = data.solicitud?.convocatoria?.tipo_programa || data.solicitud?.convocatoria?.tipoPrograma;
        if (tipoPrograma?.id) {
          // Try to fetch dynamic criteria for this program
          api.get(`/catalogs/programa/${tipoPrograma.id}/criterios`)
            .then(({ data: response }) => {
              const criterios = response.data;
              if (Array.isArray(criterios) && criterios.length > 0) {
                // Check if it's grouped by etapas or flat
                const firstItem = criterios[0];
                if (firstItem.criterios && Array.isArray(firstItem.criterios)) {
                  // Grouped by etapa: flatten them
                  const flattened = criterios.flatMap((etapa: any) => etapa.criterios);
                  setCriteriosDinamicos(flattened);
                  setIsDynamic(true);
                  // Initialize scores for dynamic path
                  setScores(Object.fromEntries(flattened.map((c: DynamicCriterio) => [c.id, 0])));
                } else if (firstItem.nombre) {
                  // Flat list of criterios
                  setCriteriosDinamicos(criterios as DynamicCriterio[]);
                  setIsDynamic(true);
                  setScores(Object.fromEntries(criterios.map((c: DynamicCriterio) => [c.id, 0])));
                } else {
                  // Fallback to legacy
                  setIsDynamic(false);
                  setScores({
                    criterio_1_puntaje: 0,
                    criterio_2_puntaje: 0,
                    criterio_3_puntaje: 0,
                    criterio_4_puntaje: 0,
                  });
                }
              } else {
                // No criterios found, use legacy
                setIsDynamic(false);
                setScores({
                  criterio_1_puntaje: 0,
                  criterio_2_puntaje: 0,
                  criterio_3_puntaje: 0,
                  criterio_4_puntaje: 0,
                });
              }
            })
            .catch(() => {
              // Fallback to legacy if API fails
              setIsDynamic(false);
              setScores({
                criterio_1_puntaje: 0,
                criterio_2_puntaje: 0,
                criterio_3_puntaje: 0,
                criterio_4_puntaje: 0,
              });
            });
        } else {
          // No tipoPrograma, use legacy
          setIsDynamic(false);
          setScores({
            criterio_1_puntaje: 0,
            criterio_2_puntaje: 0,
            criterio_3_puntaje: 0,
            criterio_4_puntaje: 0,
          });
        }
      })
      .catch(() => router.push('/evaluador/evaluaciones'))
      .finally(() => setLoading(false));
  }, [id]);

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxTotal = isDynamic
    ? criteriosDinamicos.reduce((sum, c) => sum + Number(c.puntaje_maximo), 0)
    : 100;
  const aprobado = total >= puntajeMinimo;
  const porcentaje = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  const getScoreColor = (val: number, maxVal: number = 25) => {
    const percentage = (val / maxVal) * 100;
    if (percentage >= 80) return colorMap.states.success.text;
    if (percentage >= 50) return colorMap.states.warning.text;
    return colorMap.states.error.text;
  };

  const getScorecardColors = (totalVal: number, isAprobado: boolean) => {
    if (totalVal === 0) {
      return {
        bg: 'bg-neutral-50 dark:bg-neutral-900',
        border: 'border-neutral-200 dark:border-neutral-700',
        textNumber: 'text-neutral-300',
        textCheck: 'text-neutral-300',
        badgeBg: 'bg-neutral-100 dark:bg-neutral-800',
        badgeBorder: 'border-neutral-200 dark:border-neutral-700',
        badgeText: 'text-neutral-400 dark:text-neutral-500',
        progressFill: 'bg-neutral-300',
      };
    }
    if (isAprobado) {
      return {
        bg: colorMap.states.success.background,
        border: colorMap.states.success.border,
        textNumber: colorMap.states.success.text,
        textCheck: colorMap.states.success.text,
        badgeBg: colorMap.states.success.background,
        badgeBorder: colorMap.states.success.border,
        badgeText: colorMap.states.success.text,
        progressFill: colorMap.states.success.text,
      };
    }
    return {
      bg: colorMap.states.error.background,
      border: colorMap.states.error.border,
      textNumber: colorMap.states.error.text,
      textCheck: colorMap.states.error.text,
      badgeBg: colorMap.states.error.background,
      badgeBorder: colorMap.states.error.border,
      badgeText: colorMap.states.error.text,
      progressFill: colorMap.states.error.text,
    };
  };

  const handleSlider = (key: string | number, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // Validar que todos los criterios tengan al menos 1 punto
    const scoreValues = Object.values(scores);
    if (scoreValues.length === 0 || scoreValues.every(s => s === 0)) {
      setEvalError('Debes calificar al menos un criterio. No puedes enviar un dictamen con todos los puntajes en 0.');
      return;
    }

    // Validar que NO haya criterios sin calificar (excepto el primero que puede ser 0)
    // En realidad, para que sea justo, todos deben estar >= 0, pero vamos a validar:
    // - Si es dynamic: todos los criterios deben tener un score
    // - Si es legacy: al menos 2 criterios deben estar > 0
    if (isDynamic) {
      const unchecked = criteriosDinamicos.filter(c => scores[c.id] === undefined || scores[c.id] === null);
      if (unchecked.length > 0) {
        setEvalError(`Faltan criterios sin calificar: ${unchecked.map(c => c.nombre).join(', ')}`);
        return;
      }
    }

    // Validar que aceptó carta de imparcialidad
    if (!cartaImparcialidadAceptada) {
      setEvalError('Debes aceptar la Carta de Imparcialidad para emitir el dictamen.');
      return;
    }

    setEvalError(null);

    setConfirmState({
      open: true,
      title: 'Emitir Dictamen',
      description: `¿Confirmas emitir el dictamen con un puntaje de ${total}/${maxTotal}? Resultado: ${aprobado ? 'APROBADO ✓' : 'RECHAZADO ✗'}`,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          let payload: any;
          if (isDynamic) {
            // Dynamic path: send array of criterios
            payload = {
              criterios_puntajes: criteriosDinamicos.map((c) => ({
                criterio_id: c.id,
                puntaje_obtenido: scores[c.id] || 0,
              })),
              comentarios_justificacion,
              carta_imparcialidad_aceptada: cartaImparcialidadAceptada,
            };
          } else {
            // Legacy path: spread scores
            payload = {
              ...scores,
              comentarios_justificacion,
              carta_imparcialidad_aceptada: cartaImparcialidadAceptada,
            };
          }

          await api.post(`/evaluador/asignaciones/${id}/dictamen`, payload);
          setFeedback({ type: 'success', message: `Dictamen emitido exitosamente. Puntaje: ${total}/${maxTotal} — ${aprobado ? 'Aprobado' : 'Rechazado'}` });
          setTimeout(() => router.push('/evaluador/evaluaciones'), 1500);
        } catch (error) {
          const errorMsg = error instanceof Error
            ? (error as any).response?.data?.error || error.message
            : 'Error al emitir el dictamen';
          setFeedback({ type: 'error', message: errorMsg });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="default"
      />
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/evaluador/evaluaciones">
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Formato B — Rúbrica de Evaluación Técnico-Académica</p>
          <h1 className="text-2xl font-bold text-neutral-dark leading-tight">Dictamen del Proyecto</h1>
        </div>
      </div>

      {/* Project Summary Card */}
      {asignacion && (
        <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
          <CardContent className="pt-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Proyecto / Folio</p>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{asignacion.solicitud?.titulo_proyecto}</p>
                <p className="text-xs text-primary font-mono mt-0.5">{asignacion.solicitud?.folio}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Institución</p>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{asignacion.solicitud?.empresa?.nombre || 'N/A'}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Modalidad: {asignacion.solicitud?.modalidad}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SCORECARD — Total Meter */}
      {(() => {
        const scoreColors = getScorecardColors(total, aprobado);
        return (
          <div className={`rounded-2xl p-6 border-2 transition-all duration-500 ${scoreColors.bg} ${scoreColors.border}`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Puntaje Total Acumulado</p>
                <div className={`text-6xl font-black tracking-tight transition-colors duration-300 ${scoreColors.textNumber}`}>
                  {total}
                  <span className="text-2xl font-medium text-neutral-400 dark:text-neutral-500">/{maxTotal}</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className={`text-5xl font-bold ${scoreColors.textCheck}`}>
                  {total === 0 ? '—' : aprobado ? '✓' : '✗'}
                </div>
                <span className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${scoreColors.badgeBg} ${scoreColors.badgeBorder} ${scoreColors.badgeText}`}>
                  {total === 0 ? 'Sin calificar' : aprobado ? `APROBADO (≥${puntajeMinimo})` : `RECHAZADO (<${puntajeMinimo})`}
                </span>
              </div>
            </div>

            {/* Total progress bar */}
            <div className="mt-4">
              <div className="h-3 bg-white/60 rounded-full overflow-hidden border border-white">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreColors.progressFill}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                <span>0</span>
                <span className={colorMap.states.warning.text + ' font-medium'}>{puntajeMinimo} (mínimo aprobatorio)</span>
                <span>{maxTotal}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Criterios Sliders */}
      <div className="space-y-4">
        {isDynamic ? (
          // Dynamic criterios from API
          criteriosDinamicos.map((c, idx) => {
            const val = scores[c.id] || 0;
            const colorSet = DYNAMIC_COLOR_PALETTE[idx % DYNAMIC_COLOR_PALETTE.length];

            return (
              <Card key={c.id} className={`border shadow-sm ${colorSet.border} ${colorSet.bg}`}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                    <div className="flex-1">
                      <Label className={`font-semibold text-sm ${colorSet.text}`}>{c.nombre}</Label>
                      {c.descripcion && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{c.descripcion}</p>}
                    </div>
                    <div className={`text-3xl font-black font-mono flex-shrink-0 ${getScoreColor(val, Number(c.puntaje_maximo))}`}>
                      {val}<span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">/{Number(c.puntaje_maximo)}</span>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="space-y-2 px-1">
                    <input
                      type="range"
                      min={0}
                      max={Number(c.puntaje_maximo)}
                      step={1}
                      value={val}
                      onChange={(e) => handleSlider(c.id, Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                      style={{ accentColor: getAccentColor((val / Number(c.puntaje_maximo)) * 100) }}
                    />
                    <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span key={i}>{Math.round((Number(c.puntaje_maximo) / 5) * i)}</span>
                      ))}
                    </div>
                  </div>

                  {/* Quick pick buttons */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[0, Math.round(Number(c.puntaje_maximo) * 0.25), Math.round(Number(c.puntaje_maximo) * 0.5), Math.round(Number(c.puntaje_maximo) * 0.75), Number(c.puntaje_maximo)].map((n) => (
                      <button
                        key={n}
                        onClick={() => handleSlider(c.id, n)}
                        className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${
                          val === n
                            ? `${colorSet.fill} text-white border-transparent`
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          // Legacy 4 criterios
          LEGACY_CRITERIOS.map((c) => {
            const Icon = c.icon;
            const val = scores[c.key] || 0;
            const colorSet = getCriterioColors(c.colorState);
            return (
              <Card key={c.key} className={`border shadow-sm ${colorSet.border} ${colorSet.bg}`}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-white dark:bg-neutral-900 shadow-sm border ${colorSet.border} flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${colorSet.text}`} />
                      </div>
                      <div>
                        <Label className={`font-semibold text-sm ${colorSet.text}`}>{c.label}</Label>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{c.description}</p>
                      </div>
                    </div>
                    <div className={`text-3xl font-black font-mono flex-shrink-0 ${getScoreColor(val, 25)}`}>
                      {val}<span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">/25</span>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="space-y-2 px-1">
                    <input
                      type="range"
                      min={0}
                      max={25}
                      step={1}
                      value={val}
                      onChange={(e) => handleSlider(c.key, Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                      style={{ accentColor: getAccentColor((val / 25) * 100) }}
                    />
                    <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                      <span>0</span>
                      <span>5</span>
                      <span>10</span>
                      <span>15</span>
                      <span>20</span>
                      <span>25</span>
                    </div>
                  </div>

                  {/* Quick pick buttons */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[0, 5, 10, 13, 15, 18, 20, 23, 25].map((n) => (
                      <button
                        key={n}
                        onClick={() => handleSlider(c.key, n)}
                        className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${
                          val === n
                            ? `${colorSet.fill} text-white border-transparent`
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Comentarios */}
      <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
        <CardHeader className="pb-3 bg-neutral-50/50 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-base">Comentarios y Justificación del Dictamen</CardTitle>
          <CardDescription>Opcional — máximo 1000 caracteres. Se incluirá en el resumen oficial.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            placeholder="Describe los fundamentos técnicos del dictamen, observaciones relevantes o recomendaciones adicionales para el comité..."
            className="min-h-[140px] resize-y border-neutral-300 dark:border-neutral-600 focus-visible:ring-primary"
            value={comentarios_justificacion}
            onChange={(e) => setComentarios(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500 text-right mt-1">{comentarios_justificacion.length}/2000</p>
        </CardContent>
      </Card>

      {/* Error Message */}
      {evalError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-medium text-red-700">{evalError}</p>
        </div>
      )}

      {/* Carta de Imparcialidad */}
      <Card className="border-0 shadow-sm ring-1 ring-neutral-100 bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="carta-imparcialidad"
              checked={cartaImparcialidadAceptada}
              onCheckedChange={(checked) => setCartaImparcialidad(checked === true)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="carta-imparcialidad" className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 cursor-pointer">
                Aceptar Carta de Imparcialidad
              </Label>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                Certifico bajo protesta de decir verdad que no tengo conflicto de interés en la evaluación de esta solicitud, que actuaré con imparcialidad y que mi dictamen se basa exclusivamente en criterios técnicos y académicos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-4">
        <Link href="/evaluador/evaluaciones">
          <Button variant="outline" className="h-11">Cancelar</Button>
        </Link>
        <Button
          className={`h-11 gap-2 shadow-md font-semibold px-6 transition-all ${
            aprobado && total > 0
              ? `${colorMap.states.success.background} ${colorMap.states.success.text} hover:opacity-90`
              : total > 0
              ? `${colorMap.states.error.background} ${colorMap.states.error.text} hover:opacity-90`
              : `${colorMap.primary.background} ${colorMap.primary.text} hover:opacity-90`
          }`}
          onClick={handleSubmit}
          disabled={submitting || total === 0}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Emitiendo...</>
          ) : (
            <><Send className="h-4 w-4" /> Emitir Dictamen ({total}/{maxTotal})</>
          )}
        </Button>
      </div>
    </div>
  );
}
