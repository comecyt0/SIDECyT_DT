'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, Clock } from 'lucide-react';
import type { Solicitud } from '@/types/api';

interface Props {
  solicitudes: Solicitud[];
}

export default function ObservadasClient({ solicitudes }: Props) {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">En Subsanación</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Expedientes devueltos para corrección que esperan respuesta del solicitante.
        </p>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm">Pendientes de Subsanación</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {solicitudes.length} solicitud(es) en este estado
              </p>
            </div>
          </div>
        </div>

        {solicitudes.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Sin observadas en este momento</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Las solicitudes devueltas para corrección aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
            {solicitudes.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50/60 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-mono">
                      {s.folio}
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md uppercase tracking-tight">
                      Observada
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate group-hover:text-primary transition-colors">
                    {s.titulo_proyecto}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {s.empresa?.nombre || s.user?.name || 'Solicitante'}
                    {s.updated_at && (
                      <span className="ml-2">
                        · {new Date(s.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </p>
                </div>
                <Link href={`/revisor/solicitudes/${s.id}`}>
                  <motion.button
                    whileHover={{ x: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white rounded-lg transition-all shrink-0"
                    title="Ver detalle"
                  >
                    <Eye className="w-3 h-3" />
                    Revisar
                  </motion.button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
