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

function shortSubject(row: AuditLogRow): string {
  if (!row.subject_type) return '—';
  const last = row.subject_type.split('\\').pop() ?? row.subject_type;
  return `${last}${row.subject_id ? `#${row.subject_id}` : ''}`;
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
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            Bitácora de acciones
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Quién aprobó qué, cuándo y desde dónde. Útil para auditoría y compliance.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.refresh()}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Refrescar
        </Button>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Search className="w-4 h-4" /> Filtros
          </CardTitle>
          <CardDescription>Filtra por acción, usuario o rango de fechas.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="al-action">Acción</Label>
            <Input
              id="al-action"
              placeholder="ej. solicitud.aprobada"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-user">User ID</Label>
            <Input
              id="al-user"
              type="number"
              placeholder="ID"
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
            {logs.total.toLocaleString('es-MX')} eventos
          </CardTitle>
          <CardDescription>Mostrando página {logs.current_page} de {logs.last_page}.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50 dark:bg-neutral-800">
              <TableRow>
                <TableHead className="w-44">Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Sobre</TableHead>
                <TableHead className="text-right w-32">IP</TableHead>
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
                  <TableRow key={row.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <TableCell className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      {new Date(row.created_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        {row.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.user ? (
                        <>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{row.user.name}</p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-300">{row.user.email}</p>
                        </>
                      ) : (
                        <span className="text-neutral-500 dark:text-neutral-300 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{shortSubject(row)}</TableCell>
                    <TableCell className="text-right text-xs font-mono text-neutral-500 dark:text-neutral-300">{row.ip || '—'}</TableCell>
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
