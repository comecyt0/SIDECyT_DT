'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/page-header';
import { Plus, Edit, Eye, Megaphone } from 'lucide-react';
import Link from 'next/link';
import type { Convocatoria } from '@/types/api';

interface Props {
  convocatorias: Convocatoria[];
}

const ESTADO_CONVOCATORIA: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  activa: { label: 'Activa', variant: 'default' },
  cerrada: { label: 'Cerrada', variant: 'outline' },
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ConvocatoriasClient({ convocatorias }: Props) {
  const getStatusBadge = (estado: string) => {
    const cfg = ESTADO_CONVOCATORIA[estado] ?? { label: estado.charAt(0).toUpperCase() + estado.slice(1), variant: 'outline' as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Convocatorias"
        description="Abre y cierra convocatorias y revisa cómo está configurada cada una."
        icon={<Megaphone className="h-5 w-5" />}
        actions={
          <Link href="/admin/convocatorias/nueva">
            <Button variant="rainbow">
              <Plus className="h-4 w-4" /> Nueva convocatoria
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <Megaphone className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Convocatorias registradas
          </CardTitle>
          <CardDescription>Las convocatorias activas son las que ven los solicitantes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ejercicio fiscal</TableHead>
                <TableHead>Apertura</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convocatorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="empty-state">
                      <span className="tone-chip" data-tone="violet"><Megaphone aria-hidden="true" /></span>
                      <p className="font-bold text-[var(--app-ink)]">Sin convocatorias todavía</p>
                      <p className="text-sm text-[var(--app-ink-2)]">Crea la primera con el botón «Nueva convocatoria».</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                convocatorias.map((conv) => (
                  <TableRow key={conv.id}>
                    <TableCell className="font-semibold whitespace-normal">{conv.nombre}</TableCell>
                    <TableCell>{conv.ejercicio_fiscal}</TableCell>
                    <TableCell>{formatDate(conv.fecha_apertura)}</TableCell>
                    <TableCell>{formatDate(conv.fecha_cierre)}</TableCell>
                    <TableCell>{getStatusBadge(conv.estado)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link href={`/admin/convocatorias/${conv.id}`} aria-label="Ver" title="Ver">
                          <Button variant="soft" size="icon-sm" aria-label="Ver" title="Ver">
                            <Eye />
                          </Button>
                        </Link>
                        <Link href={`/admin/convocatorias/${conv.id}/editar`} aria-label="Editar" title="Editar">
                          <Button variant="soft" size="icon-sm" aria-label="Editar" title="Editar">
                            <Edit />
                          </Button>
                        </Link>
                      </div>
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
