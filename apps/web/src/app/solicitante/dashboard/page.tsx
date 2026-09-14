'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { badgeColorMap } from '@/lib/color-mapper';
import type { Solicitud } from '@/types/api';
import {
  FolderOpen, PlusCircle, Clock, CheckCircle2, ArrowRight,
  FileText, Loader2, AlertCircle, TrendingUp,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { useMinLoadingDuration } from '@/hooks/useMinLoadingDuration';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export default function SolicitanteDashboard() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  // Garantiza skeleton visible al menos 400ms incluso si la API responde más rápido
  const showLoading = useMinLoadingDuration(loading, 400);

  useEffect(() => {
    api.get('/solicitudes')
      .then(({ data }) => setSolicitudes(Array.isArray(data) ? data : []))
      .catch(() => setSolicitudes([]))
      .finally(() => setLoading(false));
  }, []);

  const total = solicitudes.length;
  const borradores = solicitudes.filter(s => s.estado === 'borrador').length;
  const enProceso = solicitudes.filter(s =>
    !['borrador', 'aprobada', 'convenio', 'ministracion', 'cerrada', 'cancelada'].includes(s.estado)
  ).length;
  const aprobadas = solicitudes.filter(s =>
    ['aprobada', 'convenio', 'ministracion', 'cerrada'].includes(s.estado)
  ).length;

  const stats = [
    { label: 'Total Solicitudes', value: total, icon: FolderOpen, bg: 'bg-primary/10', text: 'text-primary' },
    { label: 'Borradores', value: borradores, icon: FileText, bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-600 dark:text-neutral-300' },
    { label: 'En Proceso', value: enProceso, icon: Clock, bg: 'bg-amber-100', text: 'text-amber-800' },
    { label: 'Aprobadas', value: aprobadas, icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-800' },
  ];

  return (
    <div className="space-y-8">

      {/* Header con gradient mesh */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4
                      rounded-2xl p-6 overflow-hidden
                      bg-gradient-to-br from-primary/8 via-transparent to-accent/8
                      border border-neutral-100 dark:border-neutral-800">
        <div aria-hidden="true" className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
            <span className="text-gradient">Mi</span>{' '}
            <span className="text-neutral-900 dark:text-neutral-50">Panel</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-300 mt-0.5">
            Gestiona tus proyectos de investigación y da seguimiento a tus solicitudes.
          </p>
        </div>
        <Link href="/solicitante/solicitudes/nueva" className="relative z-10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-shimmer overflow-hidden relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[var(--brand-vino-700)] text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Solicitud
          </motion.button>
        </Link>
      </div>

      {/* Stats — con skeleton mientras carga + count-up + hover lift */}
      {showLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                variants={item}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-6 shadow-sm hover:shadow-lg hover:border-primary/20 transition-[shadow,border-color] duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${s.bg}`}>
                    <Icon className={`w-5 h-5 ${s.text}`} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight tabular-nums">
                  <AnimatedNumber value={s.value} />
                </p>
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-300 uppercase tracking-widest mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Alerta si hay observadas */}
      {!loading && solicitudes.some(s => s.estado === 'observada') && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Tienes solicitudes con observaciones pendientes</p>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
              El revisor ha solicitado correcciones.{' '}
              <Link href="/solicitante/solicitudes" className="underline font-semibold">Ver solicitudes</Link>
            </p>
          </div>
        </motion.div>
      )}

      {/* Lista de solicitudes recientes */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm">Actividad Reciente</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">Estado en tiempo real de tus solicitudes</p>
              </div>
            </div>
            <Link href="/solicitante/solicitudes">
              <button className="text-xs font-bold text-primary hover:text-[var(--brand-vino-700)] transition-colors flex items-center gap-1">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>

          {showLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-neutral-100 dark:border-neutral-700">
                <FileText className="w-5 h-5 text-neutral-300 dark:text-neutral-500" />
              </div>
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Sin solicitudes todavía</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-1">Tu historial aparecerá aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {solicitudes.slice(0, 6).map((sol, i) => {
                const variant = badgeColorMap[sol.estado as keyof typeof badgeColorMap] || 'secondary';
                const displayEstado = sol.estado === 'en_revision' ? 'En Revisión'
                  : sol.estado.charAt(0).toUpperCase() + sol.estado.slice(1).replace(/_/g, ' ');
                return (
                  <motion.div
                    key={sol.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + i * 0.05 }}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md">
                          {sol.folio}
                        </span>
                        <Badge variant={variant} className="text-[10px] font-bold uppercase tracking-tight">
                          {displayEstado}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate group-hover:text-primary transition-colors">
                        {sol.titulo_proyecto}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sol.updated_at ? new Date(sol.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <Link href={`/solicitante/solicitudes/${sol.id}`}>
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
            </div>
          )}
        </div>
      </motion.div>

      {/* CTA si no hay solicitudes */}
      {!loading && solicitudes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-primary to-[var(--brand-vino-700)] rounded-2xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div>
            <p className="text-lg font-extrabold">¿Listo para solicitar apoyo?</p>
            <p className="text-white/70 text-sm mt-1">Crea tu primera solicitud e inicia el proceso de evaluación.</p>
          </div>
          <Link href="/solicitante/solicitudes/nueva">
            <motion.button
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold text-sm rounded-xl shadow-lg whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              Crear Solicitud
            </motion.button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
