'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, PlusCircle, Search, Clock, FolderOpen, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { badgeColorMap } from '@/lib/color-mapper';
import type { Solicitud } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';
import { estadoLabel } from '@/lib/solicitud-estados';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

interface Props {
  solicitudes: Solicitud[];
}

export default function SolicitudesClient({ solicitudes }: Props) {
  const [search, setSearch] = useState('');

  const filtered = Array.isArray(solicitudes) ? solicitudes.filter((s) =>
    s.folio?.toLowerCase().includes(search.toLowerCase()) ||
    s.titulo_proyecto?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const total = solicitudes.length;
  const borradores = solicitudes.filter(s => s.estado === 'borrador').length;
  const enProceso = solicitudes.filter(s => ['enviada', 'en_revision', 'en_evaluacion', 'observada'].includes(s.estado)).length;
  const aprobadas = solicitudes.filter(s => ['aprobada', 'convenio', 'ministracion', 'cerrada'].includes(s.estado)).length;

  const miniStats = [
    { label: 'Total', value: total, bg: 'bg-primary/10', text: 'text-primary' },
    { label: 'Borradores', value: borradores, bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-600 dark:text-neutral-300' },
    { label: 'En Proceso', value: enProceso, bg: 'bg-amber-50', text: 'text-amber-700' },
    { label: 'Aprobadas', value: aprobadas, bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">Mis Solicitudes</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {`Historial completo de tus proyectos registrados en ${INSTITUTION.name}.`}
          </p>
        </div>
        <Link href="/solicitante/solicitudes/nueva">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[var(--brand-vino-700)] text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl transition-shadow duration-300"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Solicitud
          </motion.button>
        </Link>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {miniStats.map((s) => (
          <div key={s.label} className={`${s.bg} ${s.text} rounded-2xl px-5 py-4`}>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest mt-0.5 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FolderOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm">Historial de Solicitudes</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {filtered.length} registro(s) encontrado(s)
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            <input
              type="search"
              placeholder="Buscar folio o título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary/30 w-64 placeholder:text-neutral-400"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-neutral-100 dark:border-neutral-700">
              <FileText className="w-5 h-5 text-neutral-300" />
            </div>
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              {search ? 'Sin resultados para tu búsqueda' : 'Sin solicitudes registradas'}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              {search ? 'Intenta con otros términos.' : 'Crea tu primera solicitud haciendo clic en "Nueva Solicitud".'}
            </p>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="divide-y divide-neutral-50 dark:divide-neutral-800">
            {filtered.map((s) => {
              const variant = badgeColorMap[s.estado as keyof typeof badgeColorMap] || 'secondary';
              return (
                <motion.div
                  key={s.id}
                  variants={item}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50/60 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md font-mono">
                        {s.folio}
                      </span>
                      <Badge variant={variant} className="text-[10px] font-bold uppercase tracking-tight">
                        {estadoLabel(s.estado)}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate group-hover:text-primary transition-colors">
                      {s.titulo_proyecto}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {s.updated_at
                        ? new Date(s.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'
                      }
                    </p>
                  </div>
                  <Link href={`/solicitante/solicitudes/${s.id}`}>
                    <motion.button
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-[var(--brand-vino-700)] transition-colors shrink-0"
                    >
                      Ver <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
