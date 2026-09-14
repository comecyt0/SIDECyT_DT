'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import type { AsignacionEvaluador } from '@/types/api';

interface Props {
  asignaciones: AsignacionEvaluador[];
}

export default function HistoricoClient({ asignaciones }: Props) {
  const resultadoBadge = (dictamen: any) => {
    if (!dictamen) return <Badge variant="secondary" className="shadow-none">Sin dictamen</Badge>;
    if (dictamen.resultado === 'aprobado') {
      return <Badge variant="default" className="shadow-none">Aprobado ✓</Badge>;
    }
    return <Badge variant="destructive" className="shadow-none">Rechazado ✗</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <History className="h-7 w-7 text-neutral-600 dark:text-neutral-300" />
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Histórico de Evaluaciones</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Registro de todos los dictámenes que has emitido hasta la fecha.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-4 w-4 text-neutral-600 dark:text-neutral-300" /> Dictámenes Emitidos
          </CardTitle>
          <CardDescription>{asignaciones.length} evaluación(es) concluida(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
              <TableRow>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Folio</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Proyecto</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200 hidden md:table-cell">Institución</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Puntaje</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asignaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-neutral-500 dark:text-neutral-400">
                    <History className="h-8 w-8 mx-auto mb-2 text-neutral-200" />
                    No hay evaluaciones concluidas todavía.
                  </TableCell>
                </TableRow>
              ) : (
                asignaciones.map((a: AsignacionEvaluador) => (
                  <TableRow key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary">{a.solicitud?.folio}</TableCell>
                    <TableCell className="font-medium text-neutral-800 dark:text-neutral-100 max-w-[220px] truncate" title={a.solicitud?.titulo_proyecto}>
                      {a.solicitud?.titulo_proyecto}
                    </TableCell>
                    <TableCell className="text-neutral-600 dark:text-neutral-300 text-sm hidden md:table-cell">
                      {a.solicitud?.empresa?.nombre || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold font-mono text-neutral-800 dark:text-neutral-100">
                        {a.dictamen?.puntaje_total ?? '—'}<span className="text-neutral-400 dark:text-neutral-500 font-normal">/100</span>
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
