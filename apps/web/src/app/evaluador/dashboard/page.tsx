'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import {
  ClipboardList, Star, CheckCircle2, ArrowRight,
  Loader2, Calendar, Award, TrendingUp,
} from 'lucide-react';
import type { AsignacionEvaluador } from '@/types/api';
import MonthlySeriesChart from '@/components/charts/MonthlySeriesChart';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { useMinLoadingDuration } from '@/hooks/useMinLoadingDuration';

type EvaluadorChartPoint = {
  label: string;
  ym: string;
  aprobadas: number;
  rechazadas: number;
  pendientes: number;
} & Record<string, string | number>;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export default function EvaluadorDashboard() {
  const [stats, setStats] = useState({ por_iniciar: 0, en_progreso: 0, evaluadas: 0 });
  const [asignaciones, setAsignaciones] = useState<AsignacionEvaluador[]>([]);
  const [chart, setChart] = useState<EvaluadorChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoadingDuration(loading, 400);

  useEffect(() => {
    Promise.all([
      api.get('/evaluador/stats').catch(() => ({ data: { por_iniciar: 0, en_progreso: 0, evaluadas: 0 } })),
      api.get('/evaluador/asignaciones').catch(() => ({ data: [] })),
      api.get<{ series_mensual: EvaluadorChartPoint[] }>('/evaluador/charts').catch(() => ({ data: { series_mensual: [] } })),
    ]).then(([{ data: statsData }, { data: asignData }, { data: chartsData }]) => {
      setStats(statsData || { por_iniciar: 0, en_progreso: 0, evaluadas: 0 });
      const items = Array.isArray(asignData) ? asignData : [];
      setAsignaciones(items.filter((a: any) => a.estado !== 'evaluado').slice(0, 6));
      setChart(Array.isArray(chartsData?.series_mensual) ? chartsData.series_mensual : []);
    }).catch(() => {
      setStats({ por_iniciar: 0, en_progreso: 0, evaluadas: 0 });
      setAsignaciones([]);
      setChart([]);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Por Iniciar',
      value: stats.por_iniciar,
      icon: ClipboardList,
      bg: 'bg-primary/10',
      text: 'text-primary',
      href: '/evaluador/asignaciones',
    },
    {
      label: 'En Progreso',
      value: stats.en_progreso,
      icon: Star,
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      href: '/evaluador/asignaciones',
    },
    {
      label: 'Dictaminadas',
      value: stats.evaluadas,
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      href: '/evaluador/historico',
    },
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
            <span className="text-neutral-900 dark:text-neutral-50">Portafolio de Evaluación</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-300 mt-0.5">
            Proyectos asignados para revisión por pares académicos.
          </p>
        </div>
        <Link href="/evaluador/asignaciones" className="relative z-10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-shimmer overflow-hidden relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[var(--brand-vino-700)] text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300"
          >
            <ClipboardList className="w-4 h-4" />
            Ver Asignaciones
          </motion.button>
        </Link>
      </div>

      {/* Stats — skeleton + count-up + hover lift */}
      {showLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                variants={item}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                <Link href={s.href}>
                  <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-6 shadow-sm hover:shadow-lg hover:border-primary/20 transition-[shadow,border-color] duration-300 cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2.5 rounded-xl ${s.bg}`}>
                        <Icon className={`w-5 h-5 ${s.text}`} />
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-300 dark:text-neutral-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight tabular-nums">
                      <AnimatedNumber value={s.value} />
                    </p>
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-300 uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Tendencia mensual */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Tendencia de Dictámenes</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5">Últimos 12 meses</p>
            </div>
            <TrendingUp className="w-4 h-4 text-neutral-300 dark:text-neutral-500" />
          </div>
          <div className="p-6">
            {showLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
              </div>
            ) : chart.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-300">Sin datos suficientes</div>
            ) : (
              <MonthlySeriesChart
                data={chart}
                bars={[
                  { key: 'aprobadas', name: 'Aprobadas', color: '#22c55e' },
                  { key: 'rechazadas', name: 'Rechazadas', color: '#ef4444' },
                  { key: 'pendientes', name: 'Pendientes', color: 'var(--brand-vino)' },
                ]}
                stacked
              />
            )}
          </div>
        </div>
      </motion.div>

      {/* Dictámenes pendientes */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-neutral-900 dark:text-neutral-50 text-sm">Dictámenes Pendientes</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">Proyectos que requieren evaluación técnica especializada</p>
              </div>
            </div>
            <Link href="/evaluador/asignaciones">
              <button className="text-xs font-bold text-primary hover:text-[var(--brand-vino-700)] transition-colors flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>

          {showLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
            </div>
          ) : asignaciones.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">¡Todo al día!</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-1">No tienes proyectos pendientes de evaluación.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {asignaciones.map((a, i) => {
                const esNuevo = a.estado === 'notificado' || a.estado === 'asignado';
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + i * 0.05 }}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                          {a.solicitud?.folio || 'S/F'}
                        </span>
                        {esNuevo ? (
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md uppercase tracking-tight">
                            Nueva Asignación
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md uppercase tracking-tight">
                            En Progreso
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate group-hover:text-primary transition-colors">
                        {a.solicitud?.titulo_proyecto || 'Sin título'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-neutral-500 dark:text-neutral-300 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {a.solicitud?.area_conocimiento?.nombre || 'Área no definida'}
                        </span>
                        {a.fecha_limite && (
                          <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {a.fecha_limite ? new Date(a.fecha_limite).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/evaluador/asignaciones/${a.id}/rubrica`}>
                      <motion.button
                        whileHover={{ x: 2 }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                          esNuevo
                            ? 'bg-primary text-white hover:bg-[var(--brand-vino-700)]'
                            : 'text-primary bg-primary/[8%] hover:bg-primary hover:text-white'
                        }`}
                      >
                        {esNuevo ? 'Iniciar' : 'Continuar'}
                        <ArrowRight className="w-3 h-3" />
                      </motion.button>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
