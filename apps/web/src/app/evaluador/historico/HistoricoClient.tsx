'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/ui/page-header';
import { History, Check, X } from 'lucide-react';
import type { AsignacionEvaluador } from '@/types/api';

interface Props {
  asignaciones: AsignacionEvaluador[];
}

export default function HistoricoClient({ asignaciones }: Props) {
  const resultadoBadge = (dictamen: any) => {
    if (!dictamen) return <span className="pill" data-tone="neutral">Sin dictamen</span>;
    if (dictamen.resultado === 'aprobado') {
      return <span className="pill" data-tone="emerald">Aprobado <Check aria-hidden="true" /></span>;
    }
    return <span className="pill" data-tone="red">Rechazado <X aria-hidden="true" /></span>;
  };

  const total = asignaciones.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Historial de dictámenes"
        description="Todos los dictámenes que has emitido, con su puntaje y resultado."
        icon={<History className="h-5 w-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <History className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Dictámenes emitidos
          </CardTitle>
          <CardDescription>{total === 1 ? '1 evaluación concluida' : `${total} evaluaciones concluidas`}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead className="hidden md:table-cell">Institución</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asignaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="whitespace-normal">
                    <div className="empty-state">
                      <span className="tone-chip" data-tone="violet"><History aria-hidden="true" /></span>
                      <p className="font-bold text-[var(--app-ink)]">Todavía no has emitido dictámenes</p>
                      <p className="text-sm text-[var(--app-ink-2)]">Cuando concluyas una evaluación, aparecerá aquí.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                asignaciones.map((a: AsignacionEvaluador) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs font-semibold" style={{ color: 'var(--auth-vino)' }}>{a.solicitud?.folio}</TableCell>
                    <TableCell className="font-medium text-[var(--app-ink)] max-w-[220px] truncate" title={a.solicitud?.titulo_proyecto}>
                      {a.solicitud?.titulo_proyecto}
                    </TableCell>
                    <TableCell className="text-[var(--app-ink-2)] hidden md:table-cell">
                      {a.solicitud?.empresa?.nombre || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold font-mono text-[var(--app-ink)]">
                        {a.dictamen?.puntaje_total ?? '—'}<span className="text-[var(--app-ink-2)] font-normal">/100</span>
                      </span>
                    </TableCell>
                    <TableCell>{resultadoBadge(a.dictamen)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
