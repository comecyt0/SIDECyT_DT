'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  FileText,
  CheckCircle2,
  Bookmark,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { colorMap } from '@/lib/color-mapper';
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

const IconMap: Record<string, any> = {
  Bookmark,
  FileText,
  Users,
  CheckCircle2
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [charts, setCharts] = useState<ChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [convActiva, setConvActiva] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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
      setExportError("Error al exportar el reporte excel.");
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
    ]).then(([{ data: statsData }, { data: alertsData }, { data: convData }, { data: chartsData }]) => {
      const stats = Array.isArray(statsData) ? statsData : [];
      const alerts = Array.isArray(alertsData) ? alertsData : [];
      const convocatorias = Array.isArray(convData) ? convData : [];

      setStats(stats);
      setAlerts(alerts);
      setCharts(chartsData ?? null);

      const activa = convocatorias.find((c: any) => c.estado === 'activa');
      setConvActiva(activa ? activa.nombre : null);
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
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  } as any;

  return (
    <div className="space-y-10">
      {exportError && <AlertBox type="error" message={exportError} onClose={() => setExportError(null)} />}
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Bienvenido, Administrador</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium italic opacity-80">{`Vista General del Sistema Integral ${INSTITUTION.name}`}</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl shadow-soft-xl border border-neutral-100 dark:border-neutral-700">
          <div className="px-4 py-2 bg-primary/5 rounded-xl">
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
              {convActiva ? `Convocatoria Activa: ${convActiva}` : 'Sin Convocatoria Activa'}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportExcel}
            disabled={exporting}
            className={`flex items-center gap-2 ${colorMap.states.success.background} ${colorMap.states.success.text} px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-50`}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar Excel
          </motion.button>
          <motion.a
            href="/admin/convocatorias"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`${colorMap.primary.background} ${colorMap.primary.foreground} px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer`}
          >
            Gestionar Convocatorias
          </motion.a>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-3xl" />
          ))
        ) : (
          stats.map((stat, i) => {
            const Icon = IconMap[stat.icon] || Bookmark;
            return (
              <motion.div key={i} variants={itemVariants}>
                <Card className="border-0 shadow-soft-xl rounded-3xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
                  <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 ${stat.color || 'text-primary'}`}>
                    <Icon className="h-16 w-16" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-[0.2em]">{stat.title}</CardTitle>
                    <div className="h-10 w-10 rounded-2xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-500">
                      <Icon className={`h-5 w-5 ${stat.color || 'text-primary'}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tighter">{stat.value}</div>
                      {stat.trend && (
                        <div className={`flex items-center gap-1 text-[11px] font-bold ${colorMap.states.success.text} ${colorMap.states.success.background} px-2.5 py-1 rounded-full mb-1`}>
                          <TrendingUp className="h-3 w-3" />
                          {stat.trend}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Operación en tiempo real */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReverbStatusWidget />
        <div className="md:col-span-2 bg-white dark:bg-neutral-900 rounded-3xl border-0 shadow-soft-xl px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400">
          <p className="font-bold text-neutral-700 dark:text-neutral-200 text-sm mb-1">Estado del sistema</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Respaldo diario programado a las 02:00 hrs.</li>
            <li>Bitácora de auditoría disponible en <Link href="/admin/audit-logs" className="font-semibold text-primary hover:underline">/admin/audit-logs</Link>.</li>
            <li>Si las notificaciones en tiempo real no responden, contactar al equipo de soporte técnico.</li>
          </ul>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Solicitudes por mes (Bar) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-soft-xl rounded-3xl h-full bg-white dark:bg-neutral-900 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-50 dark:border-neutral-800 pb-6 p-8">
              <div>
                <CardTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Solicitudes por Mes</CardTitle>
                <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5">Últimos 12 meses</p>
              </div>
              <Link href="/admin/solicitudes" className={`text-xs font-bold ${colorMap.accent.text} hover:underline flex items-center gap-1`}>
                Ver detalle <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : !charts || charts.series_mensual.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-300 border-2 border-dashed border-neutral-100 dark:border-neutral-700 rounded-2xl">
                  <FileText className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-xs">Sin datos suficientes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.series_mensual} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      formatter={(v) => [String(v ?? 0), 'Solicitudes']}
                      labelFormatter={(l) => `Mes: ${String(l ?? '')}`}
                      contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #f1f5f9' }}
                    />
                    <Bar dataKey="solicitudes" fill="var(--brand-vino)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Distribución por estado (Pie) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-soft-xl rounded-3xl h-full bg-white dark:bg-neutral-900 overflow-hidden">
            <CardHeader className="border-b border-neutral-50 dark:border-neutral-800 pb-6 p-8">
              <CardTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Distribución por Estado</CardTitle>
              <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5">Snapshot actual</p>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : !charts || charts.distribucion_estado.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-300 border-2 border-dashed border-neutral-100 dark:border-neutral-700 rounded-2xl">
                  <FileText className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-xs">Sin datos</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={charts.distribucion_estado}
                      dataKey="total"
                      nameKey="estado"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {charts.distribucion_estado.map((entry) => (
                        <Cell key={entry.estado} fill={ESTADO_COLORS[entry.estado] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, _name, p) => {
                        const estado = (p as { payload?: { estado?: string } } | undefined)?.payload?.estado ?? '';
                        return [String(v ?? 0), ESTADO_LABEL[estado] ?? estado];
                      }}
                      contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #f1f5f9' }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value: string) => ESTADO_LABEL[value] ?? value}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monto solicitado vs aprobado (Line) + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-soft-xl rounded-3xl bg-white dark:bg-neutral-900 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-50 dark:border-neutral-800 pb-6 p-8">
              <div>
                <CardTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Monto Solicitado vs Aprobado</CardTitle>
                <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5">Comparativo mensual MXN</p>
              </div>
              <Link href="/admin/convenios" className={`text-xs font-bold ${colorMap.accent.text} hover:underline flex items-center gap-1`}>
                Ver convenios <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                </div>
              ) : !charts || charts.series_mensual.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-300 border-2 border-dashed border-neutral-100 dark:border-neutral-700 rounded-2xl">
                  <TrendingUp className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-xs">Sin montos suficientes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={charts.series_mensual} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
                    <Tooltip
                      formatter={(v) => currencyFmt(Number(v ?? 0))}
                      contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #f1f5f9' }}
                    />
                    <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="monto_solicitado" name="Solicitado" stroke="var(--brand-vino)" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="monto_aprobado" name="Aprobado" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        {/* System Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-soft-xl rounded-3xl h-full flex flex-col bg-white dark:bg-neutral-900">
            <CardHeader className="border-b border-neutral-50 dark:border-neutral-800 pb-6 p-8">
              <CardTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Alertas Críticas</CardTitle>
              <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5">Pendientes que requieren atención</p>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="skeleton h-20 rounded-2xl" />
                ))
              ) : alerts.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className={`h-16 w-16 ${colorMap.states.success.background} rounded-full flex items-center justify-center mx-auto mb-4 border ${colorMap.states.success.border}`}>
                    <CheckCircle2 className={`h-8 w-8 ${colorMap.states.success.text}`} />
                  </div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Sistema al día</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">No hay alertas de prioridad alta.</p>
                </div>
              ) : (
                alerts.map((alert, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + (i * 0.1) }}
                    className={`flex items-start gap-4 p-5 rounded-3xl border border-neutral-100/50 dark:border-neutral-700/50 ${
                      alert.type === 'error'
                        ? colorMap.states.error.background
                        : colorMap.states.info.background
                    } group cursor-pointer hover:border-primary/20 transition-all duration-300`}
                  >
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      alert.type === 'error'
                        ? colorMap.states.error.text.replace('text-', 'bg-')
                        : colorMap.states.info.text.replace('text-', 'bg-')
                    }`} />
                    <div className="space-y-1.5">
                      <p className="text-xs text-neutral-800 dark:text-neutral-100 leading-relaxed font-medium">{alert.message ?? alert.mensaje}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-widest">
                        <Clock className="h-3 w-3" />
                        Tiempo Real
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
            <div className="p-8 pt-0 mt-auto">
            <Link href="/admin/notificaciones">
              <div className="w-full py-4 text-xs font-bold text-neutral-500 dark:text-neutral-300 hover:text-primary bg-neutral-50 dark:bg-neutral-800 hover:bg-primary/5 rounded-2xl transition-all border border-neutral-100 dark:border-neutral-700 text-center cursor-pointer">
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
