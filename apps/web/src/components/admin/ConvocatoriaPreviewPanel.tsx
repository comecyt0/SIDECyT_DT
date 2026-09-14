'use client';

import { motion } from 'framer-motion';
import { Eye, Calendar, DollarSign, FileText, ListChecks, Award, Layers, Tag } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';

interface PreviewCampo {
  etiqueta: string;
  tipo_campo: string;
  requerido: boolean;
}

interface PreviewDocumento {
  nombre: string;
  obligatorio: boolean;
}

interface PreviewRubro {
  nombre: string;
  porcentaje_maximo: number;
}

interface PreviewCriterio {
  nombre: string;
  ponderacion: number;
}

interface Props {
  convocatoria: {
    nombre?: string;
    ejercicio_fiscal?: string;
    descripcion?: string;
    fecha_apertura?: string;
    fecha_cierre?: string;
    monto_maximo_apoyo?: number;
    porcentaje_aportacion_minima?: number;
    categoria?: { nombre: string; color?: string } | null;
  };
  programa?: {
    nombre?: string;
    tipo_apoyo?: string;
    tiene_etapas?: boolean;
    tiene_equipo?: boolean;
  };
  campos?: PreviewCampo[];
  documentos?: PreviewDocumento[];
  rubros?: PreviewRubro[];
  criterios?: PreviewCriterio[];
}

/**
 * Panel lateral en vivo que muestra cómo el solicitante verá la convocatoria
 * a medida que el admin la configura en el wizard.
 *
 * Sticky en pantallas grandes, fluido en mobile.
 */
export default function ConvocatoriaPreviewPanel({
  convocatoria,
  programa,
  campos = [],
  documentos = [],
  rubros = [],
  criterios = [],
}: Props) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="lg:sticky lg:top-24 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto
                 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800
                 shadow-lg shadow-primary/[6%]"
    >
      {/* Header del preview */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[var(--brand-vino-700)] text-white px-5 py-3 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 opacity-80" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Vista previa</h3>
        </div>
        <p className="text-[10px] text-white/70 mt-0.5">Así verá la convocatoria el solicitante</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Título + categoría */}
        <div>
          {convocatoria.categoria && (
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                {convocatoria.categoria.nombre}
              </span>
            </div>
          )}
          <h2 className="text-base font-extrabold text-neutral-900 dark:text-neutral-50 leading-tight">
            {convocatoria.nombre || (
              <span className="text-neutral-300 dark:text-neutral-600 italic font-normal">
                Nombre de la convocatoria…
              </span>
            )}
          </h2>
          {convocatoria.ejercicio_fiscal && (
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5">
              Ejercicio {convocatoria.ejercicio_fiscal}
            </p>
          )}
        </div>

        {/* Programa */}
        {programa?.nombre && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-1">Programa</span>
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">{programa.nombre}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {programa.tipo_apoyo && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
                  {programa.tipo_apoyo === 'reembolso' ? 'Reembolso' :
                   programa.tipo_apoyo === 'concurrente' ? 'Concurrente' :
                   programa.tipo_apoyo === 'honorarios' ? 'Honorarios' : programa.tipo_apoyo}
                </span>
              )}
              {programa.tiene_etapas && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-50 text-amber-700">Etapas</span>
              )}
              {programa.tiene_equipo && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-sky-50 text-sky-700">Equipo</span>
              )}
            </div>
          </div>
        )}

        {/* Descripción */}
        {convocatoria.descripcion ? (
          <div className="prose prose-xs max-w-none text-xs text-neutral-600 dark:text-neutral-300">
            <p className="whitespace-pre-wrap line-clamp-6">{convocatoria.descripcion}</p>
          </div>
        ) : (
          <p className="text-[11px] italic text-neutral-300 dark:text-neutral-600">
            Sin descripción todavía…
          </p>
        )}

        {/* Fechas y montos */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Apertura</span>
            </div>
            <p className="text-[11px] font-mono text-neutral-800 dark:text-neutral-100">
              {formatDate(convocatoria.fecha_apertura) || '—'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-red-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Cierre</span>
            </div>
            <p className="text-[11px] font-mono text-neutral-800 dark:text-neutral-100">
              {formatDate(convocatoria.fecha_cierre) || '—'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3 w-3 text-emerald-700" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Monto Máximo</span>
            </div>
            <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums">
              {convocatoria.monto_maximo_apoyo ? formatCurrency(convocatoria.monto_maximo_apoyo) : '—'}
            </p>
            {convocatoria.porcentaje_aportacion_minima ? (
              <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/80 mt-0.5">
                + {convocatoria.porcentaje_aportacion_minima}% aportación concurrente
              </p>
            ) : null}
          </div>
        </div>

        {/* Campos del formulario */}
        {campos.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Campos a llenar ({campos.length})
              </span>
            </div>
            <div className="space-y-1">
              {campos.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-neutral-50 dark:bg-neutral-800/30">
                  <span className="text-neutral-700 dark:text-neutral-200 truncate">{c.etiqueta || `Campo ${i+1}`}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] uppercase text-neutral-400">{c.tipo_campo}</span>
                    {c.requerido && <span className="text-red-500 text-[10px]">*</span>}
                  </span>
                </div>
              ))}
              {campos.length > 8 && (
                <p className="text-[10px] text-neutral-400 italic pl-2">+ {campos.length - 8} más…</p>
              )}
            </div>
          </div>
        )}

        {/* Documentos requeridos */}
        {documentos.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ListChecks className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Documentos requeridos ({documentos.length})
              </span>
            </div>
            <ul className="space-y-1">
              {documentos.slice(0, 6).map((d, i) => (
                <li key={i} className="text-[11px] text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                  <span className={`w-1 h-1 rounded-full ${d.obligatorio ? 'bg-red-500' : 'bg-neutral-300'}`} />
                  <span className="truncate">{d.nombre || `Documento ${i+1}`}</span>
                </li>
              ))}
              {documentos.length > 6 && (
                <li className="text-[10px] text-neutral-400 italic pl-2.5">+ {documentos.length - 6} más…</li>
              )}
            </ul>
          </div>
        )}

        {/* Rubros */}
        {rubros.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Rubros de presupuesto ({rubros.length})
              </span>
            </div>
            <div className="space-y-1">
              {rubros.slice(0, 6).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-neutral-50 dark:bg-neutral-800/30">
                  <span className="text-neutral-700 dark:text-neutral-200 truncate">{r.nombre || `Rubro ${i+1}`}</span>
                  <span className="font-bold text-primary tabular-nums">{r.porcentaje_maximo}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Criterios de evaluación */}
        {criterios.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Award className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Criterios de evaluación ({criterios.length})
              </span>
            </div>
            <div className="space-y-1">
              {criterios.slice(0, 6).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-neutral-50 dark:bg-neutral-800/30">
                  <span className="text-neutral-700 dark:text-neutral-200 truncate">{c.nombre || `Criterio ${i+1}`}</span>
                  <span className="font-bold text-amber-700 tabular-nums">{c.ponderacion}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty global hint */}
        {!convocatoria.nombre && !programa?.nombre && campos.length === 0 && documentos.length === 0 && (
          <div className="text-center py-8">
            <Eye className="h-8 w-8 mx-auto text-neutral-200 dark:text-neutral-700 mb-2" />
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">
              A medida que llenes el wizard, aquí verás la convocatoria como la verá el solicitante.
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
