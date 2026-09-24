'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import {
  ClipboardList, Star, CheckCircle2, ArrowRight,
  Loader2, Calendar, Award, TrendingUp, LayoutDashboard,
} from 'lucide-react';
import type { AsignacionEvaluador } from '@/types/api';
import MonthlySeriesChart from '@/components/charts/MonthlySeriesChart';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import PageHeader from '@/components/ui/page-header';
import PastelFrame from '@/components/ui/pastel-frame';
import StatTile from '@/components/ui/stat-tile';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMinLoadingDuration } from '@/hooks/useMinLoadingDuration';
import { parseDate } from '@/lib/format';

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

  return (
    <div className="space-y-10">
      <PageHeader
        title="Panel de evaluación"
        description="Aquí ves los proyectos que te asignaron y cómo va cada dictamen."
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Link href="/evaluador/asignaciones">
            <Button icon={<ClipboardList className="h-4 w-4" />}>Ver mis asignaciones</Button>
          </Link>
        }
      />

      <PastelFrame tone="butter" title="Tus evaluaciones" description="Cómo van tus dictámenes. Cada tarjeta abre su lista.">
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <motion.div variants={item}>
            <StatTile
              label="Por iniciar"
              value={<AnimatedNumber value={stats.por_iniciar} />}
              icon={<ClipboardList className="h-5 w-5" />}
              tone="vino"
              hint="Todavía no abres la rúbrica"
              href="/evaluador/asignaciones"
              solid
              loading={showLoading}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatTile
              label="En evaluación"
              value={<AnimatedNumber value={stats.en_progreso} />}
              icon={<Star className="h-5 w-5" />}
              tone="gold"
              hint="Rúbricas que dejaste a medias"
              href="/evaluador/asignaciones"
              loading={showLoading}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatTile
              label="Dictámenes emitidos"
              value={<AnimatedNumber value={stats.evaluadas} />}
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="emerald"
              hint="Evaluaciones concluidas"
              href="/evaluador/historico"
              loading={showLoading}
            />
          </motion.div>
        </motion.div>
        </PastelFrame>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Card>
          <CardHeader>
            <CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
              Tendencia de dictámenes
            </CardTitle>
            <CardDescription>Cómo han quedado tus evaluaciones en los últimos 12 meses.</CardDescription>
          </CardHeader>
          <CardContent>
            {showLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--auth-vino)]" />
              </div>
            ) : chart.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-[var(--app-ink-2)]">Todavía no hay datos suficientes para mostrar la tendencia.</div>
            ) : (
              <MonthlySeriesChart
                data={chart}
                bars={[
                  { key: 'aprobadas', name: 'Aprobadas', color: '#5fb591' },
                  { key: 'rechazadas', name: 'Rechazadas', color: '#d98080' },
                  { key: 'pendientes', name: 'Pendientes', color: 'var(--brand-vino)' },
                ]}
                stacked
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Card>
          <CardHeader>
            <CardTitle>
              <ClipboardList className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
              Dictámenes pendientes
            </CardTitle>
            <CardDescription>Proyectos que esperan tu evaluación técnica.</CardDescription>
            <CardAction>
              <Link href="/evaluador/asignaciones">
                <Button variant="ghost" size="sm">
                  Ver todas <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {showLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--auth-vino)]" />
              </div>
            ) : asignaciones.length === 0 ? (
              <div className="empty-state">
                <span className="tone-chip" data-tone="emerald"><CheckCircle2 aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">Nada pendiente por ahora</p>
                <p className="text-sm text-[var(--app-ink-2)]">No tienes proyectos esperando evaluación.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--app-rule)]">
                {asignaciones.map((a, i) => {
                  const esNuevo = a.estado === 'notificado' || a.estado === 'asignado';
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.32 + i * 0.05 }}
                      className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-[var(--auth-field)] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--auth-vino)' }}>
                            {a.solicitud?.folio || 'Sin folio'}
                          </span>
                          <span className="pill" data-tone={esNuevo ? 'sky' : 'amber'}>
                            {esNuevo ? 'Por iniciar' : 'En evaluación'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[var(--app-ink)] truncate">
                          {a.solicitud?.titulo_proyecto || 'Sin título'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                          <span className="text-xs text-[var(--app-ink-2)] flex items-center gap-1">
                            <Award className="h-3 w-3" aria-hidden="true" />
                            {a.solicitud?.area_conocimiento?.nombre || 'Área sin definir'}
                          </span>
                          {a.fecha_limite && (
                            <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--auth-danger)' }}>
                              <Calendar className="h-3 w-3" aria-hidden="true" />
                              Vence el {parseDate(a.fecha_limite).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/evaluador/asignaciones/${a.id}/rubrica`} className="shrink-0">
                        <Button variant={esNuevo ? 'default' : 'soft'} size="sm">
                          {esNuevo ? 'Iniciar' : 'Continuar'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
