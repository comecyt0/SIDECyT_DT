'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  FileText,
  CheckCircle2,
  Bookmark,
  Clock,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertBox } from '@/components/ui/alert-box';
import type { DashboardStat, AlertItem } from '@/types/api';
import ReverbStatusWidget from '@/components/admin/ReverbStatusWidget';
import { INSTITUTION } from '@/lib/institution';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface ChartSeriesItem {
  label: string;
  ym: string;
  solicitudes: number;
  monto_solicitado: number;
  monto_aprobado: number;
}

interface DistribucionEstado {
  estado: string;
  total: number;
}

interface ChartsResponse {
  series_mensual: ChartSeriesItem[];
  distribucion_estado: DistribucionEstado[];
}

const ESTADO_COLORS: Record<string, string> = {
  borrador: '#94a3b8',
  enviada: '#f59e0b',
  observada: '#fb923c',
  en_evaluacion: '#a855f7',
  aprobada: '#22c55e',
  convenio: '#0ea5e9',
  ministracion: '#14b8a6',
  seguimiento: '#3b82f6',
  cerrada: '#10b981',
  rechazada: '#ef4444',
  cancelada: '#9ca3af',
};

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  observada: 'Observada',
  en_evaluacion: 'En evaluación',
  aprobada: 'Aprobada',
  convenio: 'Convenio',
  ministracion: 'Ministración',
  seguimiento: 'Seguimiento',
  cerrada: 'Cerrada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

const currencyFmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bookmark,
  FileText,
  Users,
  CheckCircle2,
  Clock,
};

/** Rotación de 4 tonos institucionales para los tiles del dashboard — ver globals.css §--tile-*. */
const TILE_TONES = [
  { bg: 'var(--tile-vino-bg)', fg: 'var(--tile-vino-fg)' },
  { bg: 'var(--tile-gold-bg)', fg: 'var(--tile-gold-fg)' },
  { bg: 'var(--tile-sky-bg)', fg: 'var(--tile-sky-fg)' },
  { bg: 'var(--tile-emerald-bg)', fg: 'var(--tile-emerald-fg)' },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function AdminDashboard() {
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [charts, setCharts] = useState<ChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [convActiva, setConvActiva] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setUserName((Cookies.get('userName') || '').split(' ')[0]);
  }, []);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await api.get('/admin/reportes/excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_Global_${INSTITUTION.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setExportError('Error al exportar el reporte excel.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/alerts'),
      api.get('/admin/convocatorias'),
      api.get<ChartsResponse>('/admin/charts'),
    ])
      .then(([{ data: statsData }, { data: alertsData }, { data: convData }, { data: chartsData }]) => {
        const stats = Array.isArray(statsData) ? statsData : [];
        const alerts = Array.isArray(alertsData) ? alertsData : [];
        const convocatorias = Array.isArray(convData) ? convData : [];

        setStats(stats);
        setAlerts(alerts);
        setCharts(chartsData ?? null);

        const activa = convocatorias.find((c: { estado?: string; nombre?: string }) => c.estado === 'activa');
        setConvActiva(activa ? (activa.nombre ?? null) : null);
      })
      .catch((err) => {
        console.error('Error fetching admin data:', err?.response?.data || err);
        setStats([]);
        setAlerts([]);
        setCharts(null);
        setConvActiva(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } },
  };

  return (
    <div className="space-y-8">
      {exportError && <AlertBox type="error" message={exportError} onClose={() => setExportError(null)} />}

      {/* Encabezado — saludo real (hora del cliente + nombre de la cookie de sesión) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="app-tag mb-2">
            <Sparkles className="w-3 h-3" /> {INSTITUTION.name} · {INSTITUTION.state}
          </p>
          <h1 className="text-[clamp(1.75rem,2.6vw,2.25rem)] font-bold tracking-tight text-[var(--app-ink)]">
            {greeting()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-[var(--app-ink-2)] mt-1">
            {convActiva ? (
              <>Convocatoria activa: <span className="font-semibold text-[var(--app-ink)]">{convActiva}</span></>
            ) : (
              'Sin convocatoria activa en este momento.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 border border-[var(--app-rule)] text-[var(--app-ink)] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[var(--app-hover-bg)] transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar Excel
          </motion.button>
          <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/admin/convocatorias"
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-[0_8px_20px_-10px_var(--auth-vino-shadow)] hover:bg-[var(--brand-vino-700)] transition-colors"
            >
              Gestionar Convocatorias
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Tiles de estadísticas — 4 tonos institucionales en rotación, datos reales de /admin/stats */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-32 rounded-[22px]" />)
        ) : stats.length === 0 ? (
          <div className="app-card sm:col-span-2 xl:col-span-4 p-8 text-center text-sm text-[var(--app-ink-2)]">
            No se pudieron cargar las estadísticas.
          </div>
        ) : (
          stats.map((stat, i) => {
            const Icon = IconMap[stat.icon] || Bookmark;
            const tone = TILE_TONES[i % TILE_TONES.length];
            const trendUp = stat.trend?.trim().startsWith('-') !== true;
            return (
              <motion.div key={stat.title} variants={itemVariants}>
                <div className="app-card p-5" data-interactive="true" style={{ background: tone.bg }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="app-tile-icon" style={{ background: tone.fg }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    {stat.trend && (
                      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: tone.fg }}>
                        {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {stat.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-extrabold text-[var(--app-ink)] tracking-tight">{stat.value}</p>
                  <p className="text-xs font-semibold text-[var(--app-ink-2)] mt-1">{stat.title}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Operación en tiempo real */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ReverbStatusWidget />
        <div className="md:col-span-2 app-card px-6 py-5 text-xs text-[var(--app-ink-2)]">
          <p className="font-bold text-[var(--app-ink)] text-sm mb-2">Estado del sistema</p>
          <ul className="space-y-1.5">
            <li>· Respaldo diario programado a las 02:00 hrs.</li>
            <li>
              · Bitácora de auditoría disponible en{' '}
              <Link href="/admin/audit-logs" className="font-semibold text-primary hover:underline">
                /admin/audit-logs
              </Link>
              .
            </li>
            <li>· Si las notificaciones en tiempo real no responden, contactar al equipo de soporte técnico.</li>
          </ul>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-2">
          <Card className="app-card border-0 h-full overflow-hidden bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between border-b p-6" style={{ borderColor: 'var(--app-rule)' }}>
              <div>
                <CardTitle className="text-base font-bold text-[var(--app-ink)]">Solicitudes por Mes</CardTitle>
                <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Últimos 12 meses</p>
              </div>
              <Link href="/admin/solicitudes" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Ver detalle <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : !charts || charts.series_mensual.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-[var(--app-ink-2)] border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--app-rule)' }}>
                  <FileText className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-xs">Sin datos suficientes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.series_mensual} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-rule)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      formatter={(v) => [String(v ?? 0), 'Solicitudes']}
                      labelFormatter={(l) => `Mes: ${String(l ?? '')}`}
                      contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--app-rule)' }}
                    />
                    <Bar dataKey="solicitudes" fill="var(--brand-vino)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="app-card border-0 h-full overflow-hidden bg-transparent">
            <CardHeader className="border-b p-6" style={{ borderColor: 'var(--app-rule)' }}>
              <CardTitle className="text-base font-bold text-[var(--app-ink)]">Distribución por Estado</CardTitle>
              <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Snapshot actual</p>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : !charts || charts.distribucion_estado.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-[var(--app-ink-2)] border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--app-rule)' }}>
                  <FileText className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-xs">Sin datos</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={charts.distribucion_estado} dataKey="total" nameKey="estado" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {charts.distribucion_estado.map((entry) => (
                        <Cell key={entry.estado} fill={ESTADO_COLORS[entry.estado] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, _name, p) => {
                        const estado = (p as { payload?: { estado?: string } } | undefined)?.payload?.estado ?? '';
                        return [String(v ?? 0), ESTADO_LABEL[estado] ?? estado];
                      }}
                      contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--app-rule)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} formatter={(value: string) => ESTADO_LABEL[value] ?? value} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monto solicitado vs aprobado (Line) + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2">
          <Card className="app-card border-0 overflow-hidden bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between border-b p-6" style={{ borderColor: 'var(--app-rule)' }}>
              <div>
                <CardTitle className="text-base font-bold text-[var(--app-ink)]">Monto Solicitado vs Aprobado</CardTitle>
                <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Comparativo mensual MXN</p>
              </div>
              <Link href="/admin/convenios" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Ver convenios <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : !charts || charts.series_mensual.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-[var(--app-ink-2)] border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--app-rule)' }}>
                  <TrendingUp className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-xs">Sin montos suficientes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={charts.series_mensual} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-rule)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => {
                        const n = Number(v ?? 0);
                        return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
                      }}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip formatter={(v) => currencyFmt(Number(v ?? 0))} contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--app-rule)' }} />
                    <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="monto_solicitado" name="Solicitado" stroke="var(--brand-vino)" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="monto_aprobado" name="Aprobado" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card className="app-card border-0 h-full flex flex-col bg-transparent">
            <CardHeader className="border-b p-6" style={{ borderColor: 'var(--app-rule)' }}>
              <CardTitle className="text-base font-bold text-[var(--app-ink)]">Alertas Críticas</CardTitle>
              <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Pendientes que requieren atención</p>
            </CardHeader>
            <CardContent className="space-y-3 p-5 flex-1">
              {loading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)
              ) : alerts.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--tile-emerald-bg)' }}>
                    <CheckCircle2 className="h-7 w-7" style={{ color: 'var(--tile-emerald-fg)' }} />
                  </div>
                  <p className="text-sm font-bold text-[var(--app-ink)]">Sistema al día</p>
                  <p className="text-xs text-[var(--app-ink-2)] mt-1">No hay alertas de prioridad alta.</p>
                </div>
              ) : (
                alerts.map((alert, i) => {
                  const isError = alert.type === 'error';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                      className="flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors duration-200 hover:border-primary/30"
                      style={{ borderColor: 'var(--app-rule)', background: isError ? 'var(--tile-vino-bg)' : 'var(--tile-sky-bg)' }}
                    >
                      <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ background: isError ? 'var(--tile-vino-fg)' : 'var(--tile-sky-fg)' }} />
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--app-ink)] leading-relaxed font-medium">{alert.message ?? alert.mensaje}</p>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--app-ink-2)] uppercase tracking-widest">
                          <Clock className="h-3 w-3" />
                          Tiempo Real
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
            <div className="p-5 pt-0">
              <Link href="/admin/notificaciones">
                <div className="w-full py-3.5 text-xs font-bold text-[var(--app-ink-2)] hover:text-primary rounded-xl transition-all border text-center cursor-pointer" style={{ borderColor: 'var(--app-rule)' }}>
                  Historial de Alertas
                </div>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
