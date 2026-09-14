'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, CheckCircle } from 'lucide-react';
import type { Informe } from '@/types/api';

interface Props {
  informes: Informe[];
}

export default function InformesClient({ informes }: Props) {
  const getStatusBadge = (estado: string) => {
    const statusVariant: Record<string, string> = {
      pendiente: 'default',
      en_revision: 'default',
      aprobado: 'default',
      rechazado: 'destructive',
    };
    const variant = statusVariant[estado] || 'default';
    return <Badge variant={variant as 'default' | 'destructive' | 'secondary' | 'outline'}>{estado?.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Seguimiento e Informes</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Gestión de informes técnicos y financieros de proyectos aprobados.</p>
        </div>
        <Button className="shadow-md">
          <FileText className="mr-2 h-4 w-4" />
          Solicitar Informe Extraordinario
        </Button>
      </div>

      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm relative overflow-hidden ring-1 ring-black/5">
        <div className="bg-gradient-to-r from-accent/20 to-transparent h-1 w-full absolute top-0" />
        <CardHeader className="bg-white/50 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-accent" />
            Bandeja de Informes Recibidos
          </CardTitle>
          <CardDescription>Monitoreo de tiempos de entrega (máx 20 días hábiles) y evidencia documental.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-50/80">
              <TableRow>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200 w-16">ID</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Folio Solicitud</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Tipo</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Fecha Límite</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200">Estado</TableHead>
                <TableHead className="font-bold text-neutral-700 dark:text-neutral-200 text-right">Revisar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {informes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">
                    No hay informes registrados en seguimiento actualmente.
                  </TableCell>
                </TableRow>
              ) : (
                informes.map((inf) => (
                  <TableRow key={inf.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <TableCell className="font-semibold text-neutral-800 dark:text-neutral-100">{inf.id}</TableCell>
                    <TableCell className="text-primary font-medium">{inf.solicitud?.folio || 'N/A'}</TableCell>
                    <TableCell className="capitalize">{inf.tipo}</TableCell>
                    <TableCell className="font-mono text-sm">{inf.fecha_limite_entrega}</TableCell>
                    <TableCell>
                      {getStatusBadge(inf.estado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-accent hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <Eye className="h-4 w-4" />
                      </Button>
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
