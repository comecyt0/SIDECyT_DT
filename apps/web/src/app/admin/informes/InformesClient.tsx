'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/page-header';
import { FileText, Eye, CheckCircle } from 'lucide-react';
import type { Informe } from '@/types/api';

interface Props {
  informes: Informe[];
}

const ESTADO_INFORME: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  en_revision: { label: 'En revisión', variant: 'outline' },
  entregado: { label: 'Entregado', variant: 'outline' },
  observado: { label: 'Con observaciones', variant: 'secondary' },
  aprobado: { label: 'Aprobado', variant: 'default' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function InformesClient({ informes }: Props) {
  const getStatusBadge = (estado: string) => {
    const cfg = ESTADO_INFORME[estado] ?? { label: estado || '—', variant: 'outline' as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Seguimiento e informes"
        description="Aquí llegan los informes técnicos y financieros de los proyectos apoyados. Revisa cada uno y registra su estado."
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Button variant="outline">
            <FileText className="h-4 w-4" /> Solicitar informe extraordinario
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <CheckCircle className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Informes recibidos
          </CardTitle>
          <CardDescription>Cada informe debe entregarse en un máximo de 20 días hábiles a partir de su fecha límite.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio de la solicitud</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha límite</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Revisar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {informes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="text-center py-14">
                      <FileText className="mx-auto h-10 w-10 mb-3 text-[var(--app-ink-2)]" aria-hidden="true" />
                      <p className="font-semibold text-[var(--app-ink)]">Sin informes todavía</p>
                      <p className="text-sm text-[var(--app-ink-2)]">Aparecen cuando un proyecto apoyado entrega su informe.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                informes.map((inf) => (
                  <TableRow key={inf.id}>
                    <TableCell className="font-mono font-medium" style={{ color: 'var(--auth-vino)' }}>{inf.solicitud?.folio || '—'}</TableCell>
                    <TableCell className="capitalize">{inf.tipo || '—'}</TableCell>
                    <TableCell>{formatDate(inf.fecha_limite_entrega)}</TableCell>
                    <TableCell>
                      {getStatusBadge(inf.estado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="soft" size="icon-sm" aria-label="Revisar informe" title="Revisar">
                        <Eye />
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
