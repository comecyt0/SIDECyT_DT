'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Search, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';

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

export default function AuditLogsClient({ logs, initialFilters }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<AuditLogsFiltersState>(initialFilters);

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,2.4vw,1.875rem)] font-bold tracking-tight text-[var(--app-ink)] flex items-center gap-2">
            <span className="app-tile-icon !w-9 !h-9 !rounded-lg"><Activity className="w-4 h-4" /></span>
            Historial de acciones
          </h1>
          <p className="text-sm text-[var(--app-ink-2)] mt-1">
            Quién hizo qué, cuándo y desde dónde. Nada de aquí se puede borrar.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.refresh()}>
          <RefreshCcw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Search className="w-4 h-4" /> Filtros
          </CardTitle>
          <CardDescription>Busca por tipo de acción, por persona o por fechas.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="al-action">Qué se hizo</Label>
            <Input
              id="al-action"
              placeholder="Ej. aprobó, rechazó, usuario…"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-user">Número de usuario</Label>
            <Input
              id="al-user"
              type="number"
              placeholder="Ej. 1"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-from">Desde</Label>
            <Input id="al-from" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-to">Hasta</Label>
            <Input id="al-to" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div className="md:col-span-5 flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => apply({ action: '', user_id: '', from: '', to: '', page: 1 })}>
              Limpiar
            </Button>
            <Button onClick={() => apply({ page: 1 })}>Aplicar</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-base text-primary">
            {logs.total.toLocaleString('es-MX')} {logs.total === 1 ? 'acción registrada' : 'acciones registradas'}
          </CardTitle>
          <CardDescription>Página {logs.current_page} de {logs.last_page}. Las más recientes primero.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50 dark:bg-neutral-800">
              <TableRow>
                <TableHead className="w-44">Cuándo</TableHead>
                <TableHead>Qué se hizo</TableHead>
                <TableHead>Quién</TableHead>
                <TableHead>Sobre qué</TableHead>
                <TableHead className="text-right w-36">Desde dónde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-neutral-500 dark:text-neutral-300">
                    Sin eventos para los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                logs.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-[var(--app-ink-2)]">
                      {new Date(row.created_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-[var(--app-ink)]">{actionLabel(row.action)}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.user ? (
                        <>
                          <p className="font-semibold text-[var(--app-ink)]">{row.user.name}</p>
                          <p className="text-[11px] text-[var(--app-ink-2)]">{row.user.email}</p>
                        </>
                      ) : (
                        <span className="text-[var(--app-ink-2)]">El sistema</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--app-ink-2)]">{shortSubject(row)}</TableCell>
                    <TableCell className="text-right text-xs text-[var(--app-ink-2)]">{row.ip || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={logs.current_page <= 1} onClick={() => goPage(logs.current_page - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </Button>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 mx-3">
            {logs.current_page} / {logs.last_page}
          </span>
          <Button variant="outline" size="sm" disabled={logs.current_page >= logs.last_page} onClick={() => goPage(logs.current_page + 1)}>
            Siguiente <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
