'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
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
  ArrowRight,
  FileSpreadsheet,
  UserCheck,
  KeyRound,
  Banknote,
  Activity,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import type { DashboardStat, AlertItem } from '@/types/api';
import ReverbStatusWidget from '@/components/admin/ReverbStatusWidget';
import { INSTITUTION } from '@/lib/institution';
import { formatDate } from '@/lib/format';
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

interface AuditRow {
  id: number;
  action: string;
  subject_type?: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string } | null;
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

/** Estados que cuentan como "avanzó": ya pasó la aprobación. */
const ESTADOS_AVANZADOS = new Set(['aprobada', 'convenio', 'ministracion', 'seguimiento', 'cerrada']);

const currencyFmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bookmark,
  FileText,
  Users,
  CheckCircle2,
  Clock,
};

/** 21/09/2026 — Paleta viva multicolor (referencia Duolingo). Cada tile toma su tono con
   data-tone; el color lo derivan .tone-card / .tone-chip en globals.css. */
const TILE_TONES = ['vino', 'sky', 'violet', 'emerald', 'amber', 'teal', 'blue', 'orange', 'rose'] as const;
/** Color vivo derivado del tono activo (usa las vars que .tone-card expone). */
const TONE_FG = 'oklch(var(--tone-fg-L) var(--tc) var(--th))';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function todayLabel(): string {
  const s = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "user.2fa_disabled" → "2fa disabled" legible; conserva el sujeto si viene. */
function humanizeAction(row: AuditRow): string {
  const raw = row.action.replace(/^[a-z]+\./, '').replace(/[._]+/g, ' ');
  const subject = row.subject_type ? row.subject_type.split('\\').pop() : null;
  return subject ? `${raw} · ${subject}` : raw;
}

export default function AdminDashboard() {
  const reduceMotion = useReducedMotion();
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [charts, setCharts] = useState<ChartsResponse | null>(null);
  const [accesosPendientes, setAccesosPendientes] = useState<number | null>(null);
  const [resetsPendientes, setResetsPendientes] = useState<number | null>(null);
  const [actividad, setActividad] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [convActiva, setConvActiva] = useState<{ nombre: string; cierre?: string | null } | null>(null);
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
    const safe = <T,>(p: Promise<{ data: T }>, fallback: T) => p.then((r) => r.data).catch(() => fallback);
    Promise.all([
      safe(api.get<DashboardStat[]>('/admin/stats'), []),
      safe(api.get<AlertItem[]>('/admin/alerts'), []),
      safe(api.get<Array<{ estado?: string; nombre?: string; fecha_cierre?: string | null }>>('/admin/convocatorias'), []),
      safe(api.get<ChartsResponse | null>('/admin/charts'), null),
      safe(api.get<Array<{ estado?: string }>>('/admin/solicitudes-acceso'), []),
      safe(api.get<Array<{ status?: string }>>('/admin/reset-requests'), []),
      safe(api.get<{ data?: AuditRow[] } | AuditRow[]>('/admin/audit-logs?per_page=6'), { data: [] }),
    ])
      .then(([statsData, alertsData, convData, chartsData, accesos, resets, audit]) => {
        setStats(Array.isArray(statsData) ? statsData : []);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
        setCharts(chartsData ?? null);
        const activa = (Array.isArray(convData) ? convData : []).find((c) => c.estado === 'activa');
        setConvActiva(activa?.nombre ? { nombre: activa.nombre, cierre: activa.fecha_cierre ?? null } : null);
        setAccesosPendientes((Array.isArray(accesos) ? accesos : []).filter((a) => a.estado === 'pendiente').length);
        setResetsPendientes((Array.isArray(resets) ? resets : []).filter((r) => r.status === 'pending').length);
        const rows = Array.isArray(audit) ? audit : (audit?.data ?? []);
        setActividad(rows);
      })
      .finally(() => setLoading(false));
  }, []);

  const statValue = (title: string): number | null => {
    const s = stats.find((x) => x.title === title);
    return s ? Number(s.value) || 0 : null;
  };

  const pipelineTotal = charts?.distribucion_estado.reduce((a, b) => a + b.total, 0) ?? 0;
  const pipelineAvanzadas = charts?.distribucion_estado.filter((d) => ESTADOS_AVANZADOS.has(d.estado)).reduce((a, b) => a + b.total, 0) ?? 0;
  const pipelinePct = pipelineTotal > 0 ? pipelineAvanzadas / pipelineTotal : 0;

  const pendientes = [
    { key: 'accesos', label: 'Solicitudes de acceso', hint: 'Cuentas por aprobar', value: accesosPendientes, href: '/admin/solicitudes-acceso', icon: UserCheck, tone: TILE_TONES[0] },
    { key: 'resets', label: 'Restablecimientos', hint: 'Contraseñas por autorizar', value: resetsPendientes, href: '/admin/reset-requests', icon: KeyRound, tone: TILE_TONES[1] },
    { key: 'revision', label: 'Solicitudes en revisión', hint: 'Enviadas u observadas', value: statValue('Solicitudes en Revisión'), href: '/admin/solicitudes', icon: FileText, tone: TILE_TONES[2] },
    { key: 'ministraciones', label: 'Ministraciones pendientes', hint: 'Pagos por liberar', value: statValue('Ministraciones Pendientes'), href: '/admin/ministraciones', icon: Banknote, tone: TILE_TONES[3] },
  ];

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } },
  };

  const RING_R = 52;
  const RING_C = 2 * Math.PI * RING_R;

  return (
    <div className="space-y-6">
      {exportError && <AlertBox type="error" message={exportError} onClose={() => setExportError(null)} />}

      {/* ── Fila 1: héroe + anillo de avance ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="app-card relative overflow-hidden xl:col-span-2 p-7 md:p-8" style={{ isolation: 'isolate' }}>
          {/* Manchas suaves del mismo sistema del login, muy tenues sobre papel */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none">
            <span className="auth-blob auth-blob-2" style={{ transform: 'translate(55%, -45%) scale(0.9)', opacity: 0.5 }} />
            <span className="auth-blob auth-blob-3" style={{ transform: 'translate(70%, 20%) scale(0.7)', opacity: 0.45 }} />
          </div>
          <p className="app-tag mb-3">
            <Sparkles className="w-3 h-3" /> {todayLabel()}
          </p>
          <h1 className="text-[clamp(1.875rem,3vw,2.5rem)] font-bold tracking-tight text-[var(--app-ink)] leading-[1.05]">
            {greeting()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="mt-3 max-w-[52ch] text-[15px] text-[var(--app-ink-2)] leading-relaxed">
            {convActiva ? (
              <>
                Convocatoria activa: <span className="font-semibold text-[var(--app-ink)]">{convActiva.nombre}</span>
                {convActiva.cierre && <> · cierra el <span className="font-semibold text-[var(--app-ink)]">{formatDate(convActiva.cierre)}</span></>}
              </>
            ) : (
              'No hay ninguna convocatoria activa en este momento.'
            )}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link href="/admin/convocatorias" className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-[0_8px_20px_-10px_var(--auth-vino-shadow)] hover:bg-[var(--brand-vino-700)] transition-colors">
                <BookOpen className="h-4 w-4" /> Gestionar convocatorias
              </Link>
            </motion.div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportExcel}
              disabled={exporting}
              className="inline-flex items-center gap-2 border border-[var(--app-rule)] bg-[var(--app-card-bg)] text-[var(--app-ink)] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[var(--app-hover-bg)] transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Exportar Excel
            </motion.button>
          </div>
        </section>

        {/* Anillo de avance — datos reales de /admin/charts */}
        <section className="app-card p-6 flex flex-col">
          <p className="text-sm font-bold text-[var(--app-ink)]">Avance de solicitudes</p>
          <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Cuántas ya pasaron la aprobación</p>
          <div className="flex-1 flex items-center justify-center py-4">
            {loading ? (
              <div className="skeleton h-32 w-32 rounded-full" />
            ) : (
              <div className="relative h-36 w-36">
                <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="64" cy="64" r={RING_R} fill="none" stroke="var(--app-hover-bg)" strokeWidth="10" />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r={RING_R}
                    fill="none"
                    stroke="var(--auth-vino)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    initial={{ strokeDashoffset: RING_C }}
                    animate={{ strokeDashoffset: RING_C * (1 - pipelinePct) }}
                    transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.23, 1, 0.32, 1] }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-[var(--app-ink)] tracking-tight">{Math.round(pipelinePct * 100)}%</span>
                  <span className="text-[11px] text-[var(--app-ink-2)]">{pipelineAvanzadas} de {pipelineTotal}</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-[var(--app-ink-2)] text-center">
            {pipelineTotal === 0 ? 'Aún no hay solicitudes registradas.' : 'Aprobadas, en convenio, ministración, seguimiento o cerradas.'}
          </p>
        </section>
      </div>

      {/* ── Fila 2: pendientes ahora (tiles accionables) ── */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--app-ink)]">Pendientes ahora</h2>
            <p className="text-xs text-[var(--app-ink-2)]">Lo que espera una decisión tuya. Cada tarjeta abre su sección.</p>
          </div>
        </div>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {pendientes.map((p, i) => {
            const Icon = p.icon;
            const n = loading ? null : p.value;
            // Bento: la primera tarjeta es la "protagonista" ciruela; el resto, pastel con veladura.
            const solid = i === 0;
            return (
              <motion.div key={p.key} variants={itemVariants}>
                <Link
                  href={p.href}
                  className={`${solid ? 'app-card' : 'tone-card'} block p-5 group outline-none focus-visible:ring-4`}
                  data-interactive="true"
                  data-tone={solid ? 'solid' : p.tone}
                >
                  <div className="flex items-start justify-between">
                    <span className={solid ? 'app-tile-icon' : 'tone-chip h-11 w-11'}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="app-nav-icon !w-8 !h-8 !rounded-lg transition-transform duration-200 group-hover:translate-x-0.5" style={solid ? undefined : { color: TONE_FG }}>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  <p className={`mt-5 text-4xl font-extrabold tracking-tight ${solid ? 'text-white' : 'text-[var(--app-ink)]'}`}>
                    {n === null ? <span className="skeleton inline-block h-9 w-14 rounded-md align-middle" /> : n}
                  </p>
                  <p className={`text-sm font-semibold mt-1 ${solid ? 'text-white' : 'text-[var(--app-ink)]'}`}>{p.label}</p>
                  <p className={`text-xs ${solid ? 'text-white/75' : 'text-[var(--app-ink-2)]'}`}>{n === 0 ? 'Al día' : p.hint}</p>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Fila 3: indicadores ── */}
      <section>
        <h2 className="text-base font-bold text-[var(--app-ink)] mb-3">Indicadores generales</h2>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {loading ? (
            Array(7).fill(0).map((_, i) => <div key={i} className="skeleton h-24 rounded-[22px]" />)
          ) : stats.length === 0 ? (
            <div className="app-card col-span-full p-6 text-center text-sm text-[var(--app-ink-2)]">No se pudieron cargar los indicadores.</div>
          ) : (
            stats.map((stat, i) => {
              const Icon = IconMap[stat.icon] || Bookmark;
              const tone = TILE_TONES[i % TILE_TONES.length];
              const trendUp = stat.trend?.trim().startsWith('-') !== true;
              return (
                <motion.div key={stat.title} variants={itemVariants} className="tone-card p-4" data-tone={tone} data-interactive="true">
                  <div className="flex items-center justify-between">
                    <span className="tone-chip !w-9 !h-9 !rounded-xl">
                      <Icon className="h-4 w-4" />
                    </span>
                    {stat.trend && (
                      <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: TONE_FG }}>
                        {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {stat.trend}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-[var(--app-ink)] tracking-tight">{stat.value}</p>
                  <p className="text-[11px] font-semibold text-[var(--app-ink-2)] leading-snug mt-0.5">{stat.title}</p>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </section>

      {/* ── Fila 4: gráficas + columna derecha ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="app-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--app-rule)' }}>
              <div>
                <p className="text-base font-bold text-[var(--app-ink)]">Solicitudes por mes</p>
                <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Últimos 12 meses</p>
              </div>
              <Link href="/admin/solicitudes" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Ver detalle <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-5 pt-4">
              {loading ? (
                <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
              ) : !charts || charts.series_mensual.length === 0 ? (
                <EmptyChart icon={FileText} text="Sin datos suficientes" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.series_mensual} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-rule)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip formatter={(v) => [String(v ?? 0), 'Solicitudes']} labelFormatter={(l) => `Mes: ${String(l ?? '')}`} contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--app-rule)' }} />
                    <Bar dataKey="solicitudes" fill="var(--brand-vino)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="app-card overflow-hidden">
              <div className="border-b px-6 py-4" style={{ borderColor: 'var(--app-rule)' }}>
                <p className="text-base font-bold text-[var(--app-ink)]">Distribución por estado</p>
                <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Foto actual</p>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
                ) : !charts || charts.distribucion_estado.length === 0 ? (
                  <EmptyChart icon={FileText} text="Sin datos" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={charts.distribucion_estado} dataKey="total" nameKey="estado" cx="50%" cy="50%" innerRadius={48} outerRadius={84} paddingAngle={2}>
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
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="app-card overflow-hidden">
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--app-rule)' }}>
                <div>
                  <p className="text-base font-bold text-[var(--app-ink)]">Solicitado vs aprobado</p>
                  <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Mensual, MXN</p>
                </div>
                <Link href="/admin/convenios" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  Convenios <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
                ) : !charts || charts.series_mensual.length === 0 ? (
                  <EmptyChart icon={TrendingUp} text="Sin montos suficientes" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={charts.series_mensual} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
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
                        width={44}
                      />
                      <Tooltip formatter={(v) => currencyFmt(Number(v ?? 0))} contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--app-rule)' }} />
                      <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="monto_solicitado" name="Solicitado" stroke="var(--brand-vino)" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="monto_aprobado" name="Aprobado" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.section>
          </div>
        </div>

        {/* Columna derecha: actividad + alertas + sistema */}
        <div className="space-y-5">
          <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="app-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--app-rule)' }}>
              <div>
                <p className="text-base font-bold text-[var(--app-ink)]">Actividad reciente</p>
                <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Quién hizo qué, y cuándo</p>
              </div>
              <Link href="/admin/audit-logs" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Ver todo <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="divide-y" style={{ ['--tw-divide-opacity' as string]: 1 }}>
              {loading ? (
                Array(4).fill(0).map((_, i) => <li key={i} className="p-4"><div className="skeleton h-10 rounded-xl" /></li>)
              ) : actividad.length === 0 ? (
                <li className="p-8 text-center text-sm text-[var(--app-ink-2)]">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Sin actividad registrada.
                </li>
              ) : (
                actividad.map((row) => {
                  const initial = (row.user?.name || 'Sistema').charAt(0).toUpperCase();
                  return (
                    <li key={row.id} className="flex items-start gap-3 px-5 py-3.5 border-t first:border-t-0 hover:bg-[var(--app-hover-bg)] transition-colors" style={{ borderColor: 'var(--app-rule)' }}>
                      <span className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: 'var(--auth-vino)' }}>
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--app-ink)] truncate">{row.user?.name || 'Sistema'}</p>
                        <p className="text-xs text-[var(--app-ink-2)] truncate capitalize">{humanizeAction(row)}</p>
                      </div>
                      <span className="text-[11px] text-[var(--app-ink-2)] shrink-0 whitespace-nowrap">{formatDate(row.created_at)}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.section>

          <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="app-card overflow-hidden">
            <div className="border-b px-6 py-4" style={{ borderColor: 'var(--app-rule)' }}>
              <p className="text-base font-bold text-[var(--app-ink)]">Alertas</p>
              <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Plazos e informes que requieren atención</p>
            </div>
            <div className="p-4 space-y-2.5">
              {loading ? (
                Array(2).fill(0).map((_, i) => <div key={i} className="skeleton h-14 rounded-2xl" />)
              ) : alerts.length === 0 ? (
                <div className="text-center py-6">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--tile-emerald-bg)' }}>
                    <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--tile-emerald-fg)' }} />
                  </div>
                  <p className="text-sm font-bold text-[var(--app-ink)]">Sistema al día</p>
                  <p className="text-xs text-[var(--app-ink-2)]">No hay alertas de prioridad alta.</p>
                </div>
              ) : (
                alerts.map((alert, i) => {
                  const isError = alert.type === 'error';
                  return (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl border" style={{ borderColor: 'var(--app-rule)', background: isError ? 'var(--tile-vino-bg)' : 'var(--tile-sky-bg)' }}>
                      <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: isError ? 'var(--tile-vino-fg)' : 'var(--tile-sky-fg)' }} />
                      {/* El backend arma el texto con <strong>; el título de la convocatoria lo captura un admin,
                          así que no se inyecta como HTML: se quitan las etiquetas y se muestra como texto. */}
                      <p className="text-xs text-[var(--app-ink)] leading-relaxed">{(alert.message ?? alert.mensaje ?? '').replace(/<[^>]+>/g, '')}</p>
                    </div>
                  );
                })
              )}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="space-y-3">
            <ReverbStatusWidget />
            <div className="app-card px-5 py-4 text-xs text-[var(--app-ink-2)] space-y-1">
              <p className="font-bold text-[var(--app-ink)] text-sm">Buenas prácticas</p>
              <p>· La información se respalda automáticamente cada noche.</p>
              <p>· Si algo no responde como esperas, escribe a soporte: no hace falta reintentar varias veces.</p>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-[var(--app-ink-2)] border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--app-rule)' }}>
      <Icon className="h-10 w-10 mb-2 opacity-20" />
      <p className="text-xs">{text}</p>
    </div>
  );
}
