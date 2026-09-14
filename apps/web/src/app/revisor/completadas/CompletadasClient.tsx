'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, FileCheck2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { badgeColorMap } from '@/lib/color-mapper';
import type { Solicitud } from '@/types/api';

interface Props {
  solicitudes: Solicitud[];
}

const formatEstado = (estado: string) => {
  const map: Record<string, string> = {
    en_evaluacion: 'En Evaluación',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    convenio: 'Convenio',
    ministracion: 'Ministración',
    cerrada: 'Cerrada',
  };
  return map[estado] || estado.charAt(0).toUpperCase() + estado.slice(1);
};

export default function CompletadasClient({ solicitudes }: Props) {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">Completadas</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Expedientes que superaron la revisión documental y continúan el proceso.
        </p>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm">Expedientes Turnados</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {solicitudes.length} registro(s) procesado(s)
              </p>
            </div>
          </div>
        </div>

        {solicitudes.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Sin completadas aún</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Aquí aparecerán las solicitudes que hayas aprobado y turnado a evaluación.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
            {solicitudes.map((s, i) => {
              const variant = badgeColorMap[s.estado as keyof typeof badgeColorMap] || 'secondary';
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50/60 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md font-mono">
                        {s.folio}
                      </span>
                      <Badge variant={variant} className="text-[10px] font-bold uppercase tracking-tight">
                        {formatEstado(s.estado)}
                      </Badge>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/[8%] hover:bg-primary hover:text-white rounded-lg transition-all shrink-0"
                      title="Ver detalle"
                    >
                      <Eye className="w-3 h-3" />
                      Ver
                    </motion.button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
