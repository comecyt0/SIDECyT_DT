'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye } from 'lucide-react';
import Link from 'next/link';
import { badgeColorMap, colorMap } from '@/lib/color-mapper';
import type { Convocatoria } from '@/types/api';

interface Props {
  convocatorias: Convocatoria[];
}

export default function ConvocatoriasClient({ convocatorias }: Props) {
  const getStatusBadge = (estado: string) => {
    const variant = badgeColorMap[estado as keyof typeof badgeColorMap] || 'default';
    const displayText = estado.charAt(0).toUpperCase() + estado.slice(1);
    return <Badge variant={variant as 'default' | 'secondary' | 'destructive' | 'outline'}>{displayText}</Badge>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Convocatorias</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Gestión de aperturas, cierres y parametrización general.</p>
        </div>
        <Link href="/admin/convocatorias/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Convocatoria
          </Button>
        </Link>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary">Listado Oficial</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
              <TableRow>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">ID</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Nombre de la Convocatoria</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Ejercicio Fiscal</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Apertura</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Cierre</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Estado</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convocatorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-neutral-500 dark:text-neutral-400">
                    No hay convocatorias registradas en el sistema.
                  </TableCell>
                </TableRow>
              ) : (
                convocatorias.map((conv) => (
                  <TableRow key={conv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <TableCell className="font-medium text-neutral-600 dark:text-neutral-300">{conv.id}</TableCell>
                    <TableCell className="font-semibold text-neutral-800 dark:text-neutral-100">{conv.nombre}</TableCell>
                    <TableCell>{conv.ejercicio_fiscal}</TableCell>
                    <TableCell>{conv.fecha_apertura ? new Date(conv.fecha_apertura).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{conv.fecha_cierre ? new Date(conv.fecha_cierre).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{getStatusBadge(conv.estado)}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Link href={`/admin/convocatorias/${conv.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`${colorMap.states.info.text} hover:${colorMap.states.info.background.replace('bg-', 'bg-')}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/convocatorias/${conv.id}/editar`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`${colorMap.states.warning.text} hover:${colorMap.states.warning.background.replace('bg-', 'bg-')}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
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
