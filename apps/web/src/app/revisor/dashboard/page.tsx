'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import {
  Inbox, Clock, AlertCircle, Search, ArrowRight,
  FileText, Loader2, CheckCircle2, TrendingUp, LayoutDashboard,
} from 'lucide-react';
import type { Solicitud } from '@/types/api';
import MonthlySeriesChart from '@/components/charts/MonthlySeriesChart';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import PageHeader from '@/components/ui/page-header';
import PastelFrame from '@/components/ui/pastel-frame';
import StatTile from '@/components/ui/stat-tile';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMinLoadingDuration } from '@/hooks/useMinLoadingDuration';

type RevisorChartPoint = {
  label: string;
  ym: string;
  aprobadas_doc: number;
  observadas: number;
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

export default function RevisorDashboard() {
  const [stats, setStats] = useState({ nuevos: 0, en_subsanacion: 0, pendientes_urgentes: 0 });
  const [expedientes, setExpedientes] = useState<Solicitud[]>([]);
  const [chart, setChart] = useState<RevisorChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoadingDuration(loading, 400);

  useEffect(() => {
    const init = async () => {
      try {
        const [statsRes, expRes, chartRes] = await Promise.all([
          api.get('/revisor/stats').catch(() => ({ data: { nuevos: 0, en_subsanacion: 0, pendientes_urgentes: 0 } })),
          api.get('/revisor/solicitudes/pendientes').catch(() => ({ data: [] })),
          api.get<{ series_mensual: RevisorChartPoint[] }>('/revisor/charts').catch(() => ({ data: { series_mensual: [] } })),
        ]);
        setStats(statsRes.data || { nuevos: 0, en_subsanacion: 0, pendientes_urgentes: 0 });
        const items = Array.isArray(expRes.data) ? expRes.data
          : Array.isArray(expRes.data?.data) ? expRes.data.data : [];
        setExpedientes(items.slice(0, 6));
        setChart(Array.isArray(chartRes.data?.series_mensual) ? chartRes.data.series_mensual : []);
      } catch {
        setStats({ nuevos: 0, en_subsanacion: 0, pendientes_urgentes: 0 });
        setExpedientes([]);
        setChart([]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Bandeja de revisión"
        description="Revisa los documentos de cada solicitud y decide si pasa a evaluación técnica o regresa con observaciones."
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Link href="/revisor/solicitudes">
            <Button icon={<Search className="h-4 w-4" />}>Revisar solicitudes</Button>
          </Link>
        }
      />

      <PastelFrame tone="mint" title="Tu bandeja hoy" description="Lo que espera tu revisión. Cada tarjeta abre su lista.">
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <motion.div variants={item}>
            <StatTile
              label="Nuevas"
              value={<AnimatedNumber value={stats.nuevos} />}
              icon={<Inbox className="h-5 w-5" />}
              tone="vino"
              hint="Esperan tu revisión"
              href="/revisor/solicitudes"
              solid
              loading={showLoading}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatTile
              label="Con correcciones pendientes"
              value={<AnimatedNumber value={stats.en_subsanacion} />}
              icon={<Clock className="h-5 w-5" />}
              tone="gold"
              hint="Esperan respuesta del solicitante"
              href="/revisor/observadas"
              loading={showLoading}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatTile
              label="Urgentes"
              value={<AnimatedNumber value={stats.pendientes_urgentes} />}
              icon={<AlertCircle className="h-5 w-5" />}
              tone="orange"
              hint="Llevan más tiempo esperando"
              href="/revisor/solicitudes"
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
              Tendencia de revisión
            </CardTitle>
            <CardDescription>Cómo se han movido las solicitudes en los últimos 12 meses.</CardDescription>
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
                  { key: 'aprobadas_doc', name: 'Aprobadas', color: '#5fb591' },
                  { key: 'observadas', name: 'Con observaciones', color: '#e0a84b' },
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
              <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
              Próximas a revisar
            </CardTitle>
            <CardDescription>Solicitudes que esperan tu revisión documental.</CardDescription>
            <CardAction>
              <Link href="/revisor/solicitudes">
                <Button variant="ghost" size="sm">
                  Ver bandeja <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {showLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--auth-vino)]" />
              </div>
            ) : expedientes.length === 0 ? (
              <div className="empty-state">
                <span className="tone-chip" data-tone="emerald"><CheckCircle2 aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">Nada pendiente por ahora</p>
                <p className="text-sm text-[var(--app-ink-2)]">No hay solicitudes esperando revisión.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--app-rule)]">
                {expedientes.map((exp, i) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + i * 0.05 }}
                    className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-[var(--auth-field)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--auth-vino)' }}>
                          {exp.folio}
                        </span>
                        <span className="text-xs text-[var(--app-ink-2)]">
                          {exp.updated_at ? new Date(exp.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--app-ink)] truncate">
                        {exp.empresa?.nombre || exp.titulo_proyecto || 'Sin título'}
                      </p>
                      <p className="text-xs text-[var(--app-ink-2)] mt-0.5 flex items-center gap-1 truncate">
                        <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{exp.titulo_proyecto || 'Solicitud pendiente'}</span>
                      </p>
                    </div>
                    <Link href={`/revisor/solicitudes/${exp.id}`} className="shrink-0">
                      <Button variant="soft" size="sm">
                        <Search className="h-3.5 w-3.5" />
                        Revisar
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
