'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Search, ChevronLeft, ChevronRight, RefreshCcw, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import api from '@/lib/api';

const filterLabelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const filterInputCls = 'auth-input auth-input-static pl-4 !h-11';

export interface AuditLogRow {
  id: number;
  action: string;
  user_id: number | null;
  user?: { id: number; name: string; email: string; rol_id: number } | null;
  subject_type: string | null;
  subject_id: number | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface AuditLogsPagination {
  data: AuditLogRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface AuditLogsFiltersState {
  action: string;
  user_id: string;
  from: string;
  to: string;
}

interface Props {
  logs: AuditLogsPagination;
  initialFilters: AuditLogsFiltersState;
}

/** 14/09/2026: sin claves técnicas a la vista — cada acción se muestra en lenguaje llano. */
const ACTION_LABELS: Record<string, string> = {
  'user.2fa_enabled': 'Activó la verificación en dos pasos',
  'user.2fa_disabled': 'Desactivó la verificación en dos pasos',
  'user.2fa_recovery_used': 'Entró con un código de recuperación',
  'user.2fa_recovery_regenerated': 'Generó nuevos códigos de recuperación',
  'user.created': 'Creó un usuario',
  'user.updated': 'Actualizó un usuario',
  'user.deleted': 'Eliminó un usuario',
  'solicitud.aprobada': 'Aprobó una solicitud',
  'solicitud.rechazada': 'Rechazó una solicitud',
  'solicitud.observada': 'Devolvió una solicitud con observaciones',
  'solicitud.enviada': 'Envió una solicitud',
  'convenio.generado': 'Generó un convenio',
  'acceso.aprobado': 'Aprobó una solicitud de acceso',
  'acceso.rechazado': 'Rechazó una solicitud de acceso',
};
const SUBJECT_LABELS: Record<string, string> = {
  User: 'Usuario',
  Solicitud: 'Solicitud',
  Convenio: 'Convenio',
  Empresa: 'Empresa',
  Convocatoria: 'Convocatoria',
  Ministracion: 'Ministración',
  Informe: 'Informe',
  SolicitudAcceso: 'Solicitud de acceso',
  PasswordResetRequest: 'Restablecimiento de contraseña',
};

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const raw = action.replace(/^[a-z_]+\./, '').replace(/[._]+/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function shortSubject(row: AuditLogRow): string {
  if (!row.subject_type) return '—';
  const last = row.subject_type.split('\\').pop() ?? row.subject_type;
  const label = SUBJECT_LABELS[last] ?? last;
  return row.subject_id ? `${label} nº ${row.subject_id}` : label;
}

/** E82: hora del centro (como el resto del sistema). */
const TZ = 'America/Mexico_City';
function horaDe(v: string): string {
  return new Date(v).toLocaleTimeString('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}
/** Agrupa por día (en hora del centro) conservando el orden: más reciente primero. */
function agruparPorDia(filas: AuditLogRow[]): [string, AuditLogRow[]][] {
  const m = new Map<string, AuditLogRow[]>();
  for (const r of filas) {
    const dia = new Date(r.created_at).toLocaleDateString('es-MX', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    m.set(dia, [...(m.get(dia) ?? []), r]);
  }
  return [...m.entries()];
}

export default function AuditLogsClient({ logs, initialFilters }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<AuditLogsFiltersState>(initialFilters);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [exportando, setExportando] = useState<string | null>(null);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);
  const dias = agruparPorDia(logs.data);

  // E82: exportación con los filtros aplicados (completo) o con lo marcado (parcial).
  const exportar = async (formato: 'pdf' | 'xlsx', modo: 'completo' | 'parcial') => {
    setExportando(`-${formato}`);
    setErrorExportar(null);
    try {
      const params: Record<string, unknown> = { formato, modo };
      if (modo === 'parcial') params.ids = [...seleccion];
      else for (const k of ['action', 'user_id', 'from', 'to'] as const) if (initialFilters[k]) params[k] = initialFilters[k];
      const r = await api.get('/admin/audit-logs/exportar', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `historial-${modo}-${new Date().toISOString().slice(0, 10)}.${formato}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorExportar('No se pudo exportar. Revisa los filtros e inténtalo de nuevo.');
    } finally {
      setExportando(null);
    }
  };

  const apply = (next: Partial<AuditLogsFiltersState> & { page?: number }) => {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.action) params.set('action', merged.action);
    if (merged.user_id) params.set('user_id', merged.user_id);
    if (merged.from) params.set('from', merged.from);
    if (merged.to) params.set('to', merged.to);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    setFilters(merged);
    router.push(`/admin/audit-logs${params.toString() ? `?${params}` : ''}`);
  };

  const goPage = (p: number) => {
    if (p < 1 || p > logs.last_page) return;
    apply({ page: p });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de acciones"
        description="Quién hizo qué, cuándo y desde dónde. Nada de aquí se puede borrar."
        icon={<Activity className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCcw className="h-4 w-4" /> Actualizar
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <Search className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Filtros
          </CardTitle>
          <CardDescription>Busca por tipo de acción, por persona o por fechas.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="al-action" className={filterLabelCls}>Qué se hizo</Label>
            <input
              id="al-action"
              placeholder="Ej. aprobó, rechazó, usuario…"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className={filterInputCls}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-user" className={filterLabelCls}>Número de usuario</Label>
            <input
              id="al-user"
              type="number"
              placeholder="Ej. 1"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className={filterInputCls}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-from" className={filterLabelCls}>Desde</Label>
            <input id="al-from" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className={filterInputCls} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-to" className={filterLabelCls}>Hasta</Label>
            <input id="al-to" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className={filterInputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-5 flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => apply({ action: '', user_id: '', from: '', to: '', page: 1 })}>
              Limpiar
            </Button>
            <Button onClick={() => apply({ page: 1 })}>Aplicar</Button>
          </div>
        </CardContent>
      </Card>

      {/* E82 (20/10/2026, pedido del usuario): exportar completo (con los filtros) o parcial (lo marcado), en PDF o Excel. */}
      <div className="flex flex-wrap items-center gap-2 rounded-[16px] border px-4 py-3" style={{ borderColor: 'var(--app-rule)', backgroundColor: 'var(--app-card-bg)' }} role="toolbar" aria-label="Exportar historial">
        <span className="mr-1 text-sm font-semibold text-[var(--app-ink)]">Exportar</span>
        {seleccion.size > 0 ? (
          <>
            <span className="pill" data-tone="sky">{seleccion.size} marcada{seleccion.size === 1 ? '' : 's'}</span>
            <Button size="sm" variant="soft" disabled={exportando !== null} onClick={() => void exportar('pdf', 'parcial')}>
              {exportando === 'parcial-pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}PDF de lo marcado
            </Button>
            <Button size="sm" variant="soft" disabled={exportando !== null} onClick={() => void exportar('xlsx', 'parcial')}>
              {exportando === 'parcial-xlsx' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}Excel de lo marcado
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSeleccion(new Set())}>Quitar selección</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="soft" disabled={exportando !== null || logs.total === 0} onClick={() => void exportar('pdf', 'completo')}>
              {exportando === 'completo-pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}PDF completo
            </Button>
            <Button size="sm" variant="soft" disabled={exportando !== null || logs.total === 0} onClick={() => void exportar('xlsx', 'completo')}>
              {exportando === 'completo-xlsx' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}Excel completo
            </Button>
            <span className="text-xs text-[var(--app-ink-2)]">Con los filtros de arriba (hasta 10 000 acciones). Marca días o acciones para exportar solo eso.</span>
          </>
        )}
        {errorExportar && <p role="alert" className="w-full text-sm" style={{ color: 'var(--auth-danger)' }}>{errorExportar}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Activity className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            {logs.total.toLocaleString('es-MX')} {logs.total === 1 ? 'acción registrada' : 'acciones registradas'}
          </CardTitle>
          <CardDescription>Página {logs.current_page} de {logs.last_page}, agrupada por día. Las más recientes primero.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.data.length === 0 ? (
            <div className="empty-state">
              <span className="tone-chip" data-tone="sky"><Activity aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">Sin eventos para los filtros actuales.</p>
              <p className="text-sm text-[var(--app-ink-2)]">Amplía las fechas o limpia los filtros para ver más.</p>
            </div>
          ) : (
            dias.map(([dia, filas], n) => {
              const todas = filas.every((r) => seleccion.has(r.id));
              return (
                // E82: lista desplegable por día (el más reciente abierto). <details> nativo: teclado y lector de pantalla.
                <details key={dia} open={n === 0} className="group rounded-[14px] border" style={{ borderColor: 'var(--app-rule)' }}>
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[14px] px-4 py-3 hover:bg-[var(--sg-canvas)] [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-ink-2)] transition-transform duration-150 group-open:rotate-90" aria-hidden="true" />
                    <span className="flex-1 text-sm font-bold capitalize text-[var(--app-ink)]">{dia}</span>
                    <span className="pill" data-tone="neutral">{filas.length} {filas.length === 1 ? 'acción' : 'acciones'}</span>
                    <label className="inline-flex items-center gap-1.5 text-xs text-[var(--app-ink-2)]" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="h-4 w-4 accent-[var(--sg-vino)]" checked={todas}
                        onChange={(e) => setSeleccion((s) => { const x = new Set(s); for (const r of filas) { if (e.target.checked) x.add(r.id); else x.delete(r.id); } return x; })}
                        aria-label={`Marcar todas las acciones del ${dia}`} />
                      Marcar día
                    </label>
                  </summary>
                  <div className="overflow-x-auto border-t" style={{ borderColor: 'var(--app-rule)' }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"><span className="sr-only">Marcar</span></TableHead>
                          <TableHead className="w-20">Hora</TableHead>
                          <TableHead>Qué se hizo</TableHead>
                          <TableHead>Quién</TableHead>
                          <TableHead>Sobre qué</TableHead>
                          <TableHead className="w-36 text-right">Desde dónde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filas.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <input type="checkbox" className="h-4 w-4 accent-[var(--sg-vino)]" checked={seleccion.has(row.id)}
                                onChange={() => setSeleccion((s) => { const x = new Set(s); if (x.has(row.id)) x.delete(row.id); else x.add(row.id); return x; })}
                                aria-label={`Marcar: ${actionLabel(row.action)}`} />
                            </TableCell>
                            <TableCell className="text-xs text-[var(--app-ink-2)]">{horaDe(row.created_at)}</TableCell>
                            <TableCell><span className="text-sm font-semibold text-[var(--app-ink)]">{actionLabel(row.action)}</span></TableCell>
                            <TableCell className="text-sm">
                              {row.user ? (
                                <>
                                  <p className="font-semibold text-[var(--app-ink)]">{row.user.name}</p>
                                  <p className="text-[11px] text-[var(--app-ink-2)]">{row.user.email}</p>
                                </>
                              ) : <span className="text-[var(--app-ink-2)]">El sistema</span>}
                            </TableCell>
                            <TableCell className="text-xs text-[var(--app-ink-2)]">{shortSubject(row)}</TableCell>
                            <TableCell className="text-right text-xs text-[var(--app-ink-2)]">{row.ip || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </details>
              );
            })
          )}
        </CardContent>
        <div className="px-4 py-3 border-t border-[var(--app-rule)] flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={logs.current_page <= 1} onClick={() => goPage(logs.current_page - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </Button>
          <span className="text-xs text-[var(--app-ink-2)] mx-3">
            Página {logs.current_page} de {logs.last_page}
          </span>
          <Button variant="outline" size="sm" disabled={logs.current_page >= logs.last_page} onClick={() => goPage(logs.current_page + 1)}>
            Siguiente <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
