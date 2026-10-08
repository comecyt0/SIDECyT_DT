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
  FileSpreadsheet,
  UserCheck,
  Banknote,
  Activity,
  BookOpen,
} from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import type { DashboardStat, AlertItem, EstadoPublicoConvocatoria } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import StatTile, { type TileTone } from '@/components/ui/stat-tile';
import PastelFrame from '@/components/ui/pastel-frame';
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
import UserAvatar from '@/components/ui/user-avatar';
import { useRol } from '@/hooks/useRol';

/**
 * Dashboard de administración — v3 (24/09/2026, sistema SIGAE: landing + referencia Aboard).
 * Ritmo papel → pastel → papel: héroe sobre el lienzo, pendientes en marco lavanda con tarjetas blancas,
 * indicadores como columnas de valor sin marco, gráficas en marco cielo, actividad y alertas en blanco.
 * Color sin saturar: el pastel enmarca; vino y navy solo en detalles, cifras y gráficas.
 */

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

/** Colores de la gráfica de pastel: mismos significados, luminosidad alta y croma baja (sin saturar). */
const ESTADO_COLORS: Record<string, string> = {
  borrador: '#b8c2cc',
  enviada: '#eec170',
  observada: '#f1a883',
  en_evaluacion: '#b6a2ee',
  aprobada: '#7fcb9c',
  convenio: '#7cbfe4',
  ministracion: '#6fcac0',
  seguimiento: '#8eaeee',
  cerrada: '#5fb591',
  rechazada: '#e59393',
  cancelada: '#c7c7c7',
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

const INK = '#08304c';
const VINO = 'oklch(36% 0.1 358)';
const AXIS = { fontSize: 11, fill: '#8a94a0' };
const TOOLTIP = { borderRadius: 14, fontSize: 12, border: '0', boxShadow: '0 2px 8px rgba(205,205,205,0.6)' };

const currencyFmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bookmark,
  FileText,
  Users,
  CheckCircle2,
  Clock,
};

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
  // E45: el admin de convocatoria y la consulta usan este dashboard con sus cifras (alcance en el backend).
  const { esAdmin, esConsulta, listo } = useRol();
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [charts, setCharts] = useState<ChartsResponse | null>(null);
  const [accesosPendientes, setAccesosPendientes] = useState<number | null>(null);
  const [actividad, setActividad] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [convActiva, setConvActiva] = useState<{ nombre: string; cierre?: string | null; prorroga: boolean } | null>(null);
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
      setExportError('No se pudo exportar el reporte de Excel. Intenta de nuevo en un momento.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    type ConvRow = { nombre?: string; estado_publico?: EstadoPublicoConvocatoria; fecha_cierre_efectiva?: string | null; fecha_prorroga?: string | null };
    const safe = <T,>(p: Promise<{ data: T }>, fallback: T) => p.then((r) => r.data).catch(() => fallback);
    const soloAdmin = (Cookies.get('userRole') || 'admin') === 'admin';
    Promise.all([
      safe(api.get<DashboardStat[]>('/admin/stats'), []),
      safe(api.get<AlertItem[]>('/admin/alerts'), []),
      safe(api.get<ConvRow[]>('/admin/convocatorias'), []),
      safe(api.get<ChartsResponse | null>('/admin/charts'), null),
      // E45: estas tres son solo del admin general; los demás roles no las piden.
      soloAdmin ? safe(api.get<Array<{ estado?: string }>>('/admin/solicitudes-acceso'), []) : Promise.resolve([]),
      soloAdmin ? safe(api.get<{ data?: AuditRow[] } | AuditRow[]>('/admin/audit-logs?per_page=6'), { data: [] }) : Promise.resolve({ data: [] as AuditRow[] }),
    ])
      .then(([statsData, alertsData, convData, chartsData, accesos, audit]) => {
        setStats(Array.isArray(statsData) ? statsData : []);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
        setCharts(chartsData ?? null);
        // E40: "activa" = recibe solicitudes hoy (abierta o con prórroga), no solo estado='activa'.
        const activa = (Array.isArray(convData) ? convData : []).find((c) => c.estado_publico === 'abierta' || c.estado_publico === 'prorroga');
        setConvActiva(activa?.nombre ? { nombre: activa.nombre, cierre: activa.fecha_cierre_efectiva ?? null, prorroga: Boolean(activa.fecha_prorroga) } : null);
        setAccesosPendientes((Array.isArray(accesos) ? accesos : []).filter((a) => a.estado === 'pendiente').length);
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

  const pendientes: { key: string; label: string; hint: string; value: number | null; href: string; icon: typeof UserCheck; tone: TileTone }[] = [
    // Accesos y restablecimientos: solo el admin general los atiende.
    ...(esAdmin ? [
      { key: 'accesos', label: 'Solicitudes de acceso', hint: 'Cuentas por aprobar', value: accesosPendientes, href: '/admin/solicitudes-acceso', icon: UserCheck, tone: 'vino' as TileTone },
    ] : []),
    { key: 'revision', label: 'Solicitudes en revisión', hint: 'Enviadas u observadas', value: statValue('Solicitudes en Revisión'), href: '/admin/solicitudes', icon: FileText, tone: 'violet' },
    ...(!esConsulta ? [
      { key: 'ministraciones', label: 'Ministraciones pendientes', hint: 'Pagos por liberar', value: statValue('Ministraciones Pendientes'), href: '/admin/ministraciones', icon: Banknote, tone: 'emerald' as TileTone },
    ] : [
      { key: 'folios', label: 'Folios', hint: 'Histórico de aprobados y no aprobados', value: statValue('Dictámenes Aprobados'), href: '/admin/folios', icon: CheckCircle2, tone: 'emerald' as TileTone },
    ]),
  ];

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } },
  };

  const RING_R = 52;
  const RING_C = 2 * Math.PI * RING_R;

  return (
    <div className="dash">
      {exportError && <AlertBox type="error" message={exportError} onClose={() => setExportError(null)} />}

      {/* ── Héroe sobre el lienzo (como la landing): saludo, contexto y acciones; anillo de avance a la derecha ── */}
      <section className="dash-hero" aria-labelledby="dash-title">
        <div className="min-w-0">
          <p className="panel-hero-pill"><span aria-hidden="true" />{todayLabel()}</p>
          <h1 id="dash-title" className="dash-hero-title">
            {greeting()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="dash-hero-desc">
            {convActiva ? (
              <>
                Convocatoria {convActiva.prorroga ? 'con prórroga' : 'abierta'}: <strong>{convActiva.nombre}</strong>
                {convActiva.cierre && <> · recibe solicitudes hasta el <strong>{formatDate(convActiva.cierre)}</strong></>}
              </>
            ) : (
              'No hay ninguna convocatoria recibiendo solicitudes en este momento. Publica una desde Convocatorias.'
            )}
          </p>
          <div className="dash-hero-actions">
            {listo && !esConsulta ? (
              <Link href="/admin/convocatorias">
                <Button><BookOpen className="h-4 w-4" /> {esAdmin ? 'Gestionar convocatorias' : 'Mis convocatorias'}</Button>
              </Link>
            ) : listo ? (
              <Link href="/admin/folios">
                <Button><CheckCircle2 className="h-4 w-4" /> Ver folios</Button>
              </Link>
            ) : null}
            <Button variant="outline" onClick={handleExportExcel} isLoading={exporting}>
              {!exporting && <FileSpreadsheet className="h-4 w-4" />} Exportar Excel
            </Button>
          </div>
        </div>

        {/* Anillo de avance — datos reales de /admin/charts */}
        <div className="dash-ring" role="group" aria-label="Avance de solicitudes">
          <p className="dash-ring-title">Avance de solicitudes</p>
          <p className="dash-ring-sub">Cuántas ya pasaron la aprobación</p>
          <div className="flex flex-1 items-center justify-center py-3">
            {loading ? (
              <div className="skeleton h-32 w-32 rounded-full" />
            ) : (
              <div className="relative h-36 w-36">
                <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="64" cy="64" r={RING_R} fill="none" stroke="var(--pastel-lavender)" strokeWidth="10" />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r={RING_R}
                    fill="none"
                    stroke={VINO}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    initial={{ strokeDashoffset: RING_C }}
                    animate={{ strokeDashoffset: RING_C * (1 - pipelinePct) }}
                    transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.23, 1, 0.32, 1] }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="dash-ring-value">{Math.round(pipelinePct * 100)}%</span>
                  <span className="text-[11px] text-[var(--app-ink-2)]">{pipelineAvanzadas} de {pipelineTotal}</span>
                </div>
              </div>
            )}
          </div>
          <p className="dash-ring-sub text-center">
            {pipelineTotal === 0 ? 'Aún no hay solicitudes registradas.' : 'Aprobadas, en convenio, ministración, seguimiento o cerradas.'}
          </p>
        </div>
      </section>

      {/* ── Pendientes: marco lavanda con tarjetas blancas accionables ── */}
      <PastelFrame tone="lavender" titleId="dash-pend" title="Pendientes ahora" description="Lo que espera una decisión tuya. Cada tarjeta abre su sección.">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pendientes.map((p, i) => {
            const Icon = p.icon;
            const n = loading ? null : p.value;
            return (
              <motion.div key={p.key} variants={itemVariants}>
                <StatTile
                  label={p.label}
                  value={n ?? 0}
                  loading={n === null}
                  icon={<Icon className="h-5 w-5" />}
                  tone={p.tone}
                  hint={n === 0 ? 'Al día' : p.hint}
                  href={p.href}
                  solid={i === 0}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </PastelFrame>

      {/* ── Indicadores: columnas de valor sin marco, directo sobre el lienzo (referencia Aboard) ── */}
      <section aria-labelledby="dash-ind">
        <div className="section-head">
          <h2 id="dash-ind" className="section-title">Indicadores generales</h2>
          <p className="section-desc">Todo el sistema, en números.</p>
        </div>
        <motion.ul variants={containerVariants} initial="hidden" animate="show" className="feature-grid">
          {loading ? (
            Array(7).fill(0).map((_, i) => <li key={i} className="skeleton h-28 rounded-[20px]" />)
          ) : stats.length === 0 ? (
            <li className="col-span-full feature-col text-center text-sm text-[var(--app-ink-2)]">No se pudieron cargar los indicadores.</li>
          ) : (
            stats.map((stat) => {
              const Icon = IconMap[stat.icon] || Bookmark;
              const trendUp = stat.trend?.trim().startsWith('-') !== true;
              return (
                <motion.li key={stat.title} variants={itemVariants} className="feature-col">
                  <span className="feature-icon" aria-hidden="true"><Icon className="h-5 w-5" /></span>
                  <p className="feature-value">{stat.value}</p>
                  <p className="feature-label">{stat.title}</p>
                  {stat.trend && (
                    <p className="feature-trend" data-up={trendUp ? 'true' : 'false'}>
                      {trendUp ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                      {stat.trend}
                    </p>
                  )}
                </motion.li>
              );
            })
          )}
        </motion.ul>
      </section>

      {/* ── Gráficas en marco cielo + columna de actividad y alertas en blanco ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <PastelFrame
          tone="powder"
          className="xl:col-span-2"
          titleId="dash-graf"
          title="Solicitudes y montos"
          description="Últimos 12 meses y foto actual del proceso."
          action={{ href: '/admin/solicitudes', label: 'Ver solicitudes' }}
        >
          <div className="pf-panel">
            <p className="pf-panel-title">Solicitudes por mes</p>
            {loading ? (
              <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--app-ink-2)]" /></div>
            ) : !charts || charts.series_mensual.length === 0 ? (
              <EmptyChart icon={FileText} text="Todavía no hay solicitudes para graficar." />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.series_mensual} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sg-mist)" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={28} />
                  <Tooltip cursor={{ fill: 'var(--pastel-powder)' }} formatter={(v) => [String(v ?? 0), 'Solicitudes']} labelFormatter={(l) => `Mes: ${String(l ?? '')}`} contentStyle={TOOLTIP} />
                  <Bar dataKey="solicitudes" fill={VINO} radius={[8, 8, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="pf-panel">
              <p className="pf-panel-title">Distribución por estado</p>
              {loading ? (
                <div className="h-60 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--app-ink-2)]" /></div>
              ) : !charts || charts.distribucion_estado.length === 0 ? (
                <EmptyChart icon={FileText} text="Sin solicitudes todavía." />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={charts.distribucion_estado} dataKey="total" nameKey="estado" cx="50%" cy="50%" innerRadius={50} outerRadius={84} paddingAngle={3} stroke="none">
                      {charts.distribucion_estado.map((entry) => (
                        <Cell key={entry.estado} fill={ESTADO_COLORS[entry.estado] ?? '#b8c2cc'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, _name, p) => {
                        const estado = (p as { payload?: { estado?: string } } | undefined)?.payload?.estado ?? '';
                        return [String(v ?? 0), ESTADO_LABEL[estado] ?? estado];
                      }}
                      contentStyle={TOOLTIP}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} formatter={(value: string) => ESTADO_LABEL[value] ?? value} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="pf-panel">
              <div className="flex items-center justify-between gap-2">
                <p className="pf-panel-title">Solicitado vs aprobado</p>
                <Link href="/admin/convenios" className="pastel-frame-link">Convenios <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
              </div>
              {loading ? (
                <div className="h-60 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--app-ink-2)]" /></div>
              ) : !charts || charts.series_mensual.length === 0 ? (
                <EmptyChart icon={TrendingUp} text="Sin montos todavía." />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={charts.series_mensual} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--sg-mist)" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => {
                        const n = Number(v ?? 0);
                        return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
                      }}
                      tick={AXIS}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip formatter={(v) => currencyFmt(Number(v ?? 0))} contentStyle={TOOLTIP} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="monto_solicitado" name="Solicitado" stroke={VINO} strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="monto_aprobado" name="Aprobado" stroke={INK} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </PastelFrame>

        {/* Columna derecha: actividad + alertas (el estado de Reverb y "Buenas prácticas" se quitaron el 24/09/2026 a pedido del usuario) */}
        <div className="space-y-6">
          {esAdmin && (
          <section className="app-card overflow-hidden" aria-labelledby="dash-act">
            <div className="card-head">
              <div>
                <h2 id="dash-act" className="card-head-title">Actividad reciente</h2>
                <p className="card-head-desc">Quién hizo qué, y cuándo</p>
              </div>
              <Link href="/admin/audit-logs" className="pastel-frame-link">Ver todo <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </div>
            <ul>
              {loading ? (
                Array(4).fill(0).map((_, i) => <li key={i} className="p-4"><div className="skeleton h-10 rounded-xl" /></li>)
              ) : actividad.length === 0 ? (
                <li className="p-8 text-center text-sm text-[var(--app-ink-2)]">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" aria-hidden="true" />
                  Sin actividad registrada.
                </li>
              ) : (
                actividad.map((row) => {
                  const initial = (row.user?.name || 'Sistema').charAt(0).toUpperCase();
                  return (
                    <li key={row.id} className="list-row">
                      <UserAvatar user={row.user ?? { name: initial === 'S' ? 'Sistema' : initial }} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--app-ink)] truncate">{row.user?.name || 'Sistema'}</p>
                        <p className="text-xs text-[var(--app-ink-2)] truncate first-letter:uppercase">{humanizeAction(row)}</p>
                      </div>
                      <span className="text-[11px] text-[var(--app-ink-2)] shrink-0 whitespace-nowrap">{formatDate(row.created_at)}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          )}

          <section className="app-card overflow-hidden" aria-labelledby="dash-alert">
            <div className="card-head">
              <div>
                <h2 id="dash-alert" className="card-head-title">Alertas</h2>
                <p className="card-head-desc">Plazos e informes que requieren atención</p>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              {loading ? (
                Array(2).fill(0).map((_, i) => <div key={i} className="skeleton h-14 rounded-2xl" />)
              ) : alerts.length === 0 ? (
                <div className="empty-state !py-6">
                  <span className="tone-chip" data-tone="emerald"><CheckCircle2 aria-hidden="true" /></span>
                  <p className="text-sm font-bold text-[var(--app-ink)]">Sistema al día</p>
                  <p className="text-xs text-[var(--app-ink-2)]">No hay alertas de prioridad alta.</p>
                </div>
              ) : (
                alerts.map((alert, i) => {
                  const isError = alert.type === 'error';
                  return (
                    <div key={i} className="alert-row" data-kind={isError ? 'error' : 'info'}>
                      <span aria-hidden="true" />
                      {/* El backend arma el texto con <strong>; el título de la convocatoria lo captura un admin,
                          así que no se inyecta como HTML: se quitan las etiquetas y se muestra como texto. */}
                      <p className="text-xs text-[var(--app-ink)] leading-relaxed">
                        {(alert.message ?? alert.mensaje ?? '').replace(/<[^>]+>/g, '')}
                        {/* Enlace solo a rutas internas del panel (el valor viene de la API). */}
                        {typeof alert.href === 'string' && /^\/admin\/[a-z0-9-]+$/.test(alert.href) && (
                          <> <Link href={alert.href} className="font-semibold underline underline-offset-2">Revisar</Link></>
                        )}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="h-56 flex flex-col items-center justify-center gap-2 text-[var(--app-ink-2)]">
      <span className="feature-icon" aria-hidden="true"><Icon className="h-5 w-5" /></span>
      <p className="text-xs">{text}</p>
    </div>
  );
}
