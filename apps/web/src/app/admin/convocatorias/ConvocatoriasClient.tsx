'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/ui/page-header';
import { Plus, Edit, Eye, Megaphone, CalendarPlus, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { Convocatoria } from '@/types/api';
import { formatDate } from '@/lib/format';
import { ESTADO_PUBLICO, estadoPublico, puedeProrrogar } from '@/lib/convocatoria-estado';
import ProrrogaDialog from '@/components/admin/ProrrogaDialog';
import { useRol } from '@/hooks/useRol';
import BorradoresConvocatoria from '@/components/admin/BorradoresConvocatoria';

interface Props {
  convocatorias: Convocatoria[];
}

/** E54: nombre del programa (catálogo público) de la convocatoria, validado como texto. */
const programaDe = (c: Convocatoria): string | null => {
  const p = (c as Convocatoria & { programa_publico?: { nombre?: unknown } | null }).programa_publico;
  return p && typeof p.nombre === 'string' ? p.nombre.slice(0, 255) : null;
};

export default function ConvocatoriasClient({ convocatorias }: Props) {
  // E45: acciones visibles según el rol (el backend las permite o rechaza de todos modos).
  const { esAdmin } = useRol();
  const router = useRouter();
  const [lista, setLista] = useState<Convocatoria[]>(Array.isArray(convocatorias) ? convocatorias : []);
  const [prorroga, setProrroga] = useState<Convocatoria | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Convocatorias"
        description="Publica convocatorias, dales prórroga y revisa cómo se ven en la página pública."
        icon={<Megaphone className="h-5 w-5" />}
        actions={esAdmin ? (
          <Link href="/admin/convocatorias/nueva">
            <Button variant="rainbow">
              <Plus className="h-4 w-4" /> Nueva convocatoria
            </Button>
          </Link>
        ) : undefined}
      />

      {/* E47: borradores del asistente (solo el admin general crea convocatorias). */}
      {esAdmin && <BorradoresConvocatoria />}

      <Card>
        <CardHeader>
          <CardTitle>
            <Megaphone className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Convocatorias registradas
          </CardTitle>
          <CardDescription>
            El estado se calcula con las fechas: <strong>Próxima a abrir</strong> antes de su apertura,{' '}
            <strong>Abierta</strong> hasta su cierre, <strong>Con prórroga</strong> si se amplió el plazo y{' '}
            <strong>Cerrada</strong> después. Las abiertas son las que ven los solicitantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ejercicio</TableHead>
                <TableHead>Apertura</TableHead>
                <TableHead>Fecha límite</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.length === 0 ? (
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
                lista.map((conv) => {
                  const cfg = ESTADO_PUBLICO[estadoPublico(conv)];
                  return (
                    <TableRow key={conv.id}>
                      <TableCell className="whitespace-normal">
                        <span className="font-semibold">{conv.nombre}</span>
                        {conv.banner_url && (
                          <ImageIcon className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-[var(--app-ink-2)]" aria-label="Tiene banner" />
                        )}
                        {/* E54: programa al que pertenece */}
                        <span className="block text-xs text-[var(--app-ink-2)]">
                          {programaDe(conv) ? `Programa: ${programaDe(conv)}` : 'Sin programa asignado'}
                        </span>
                      </TableCell>
                      <TableCell>{conv.ejercicio_fiscal}</TableCell>
                      <TableCell>{formatDate(conv.fecha_apertura)}</TableCell>
                      <TableCell>
                        {formatDate(conv.fecha_cierre_efectiva ?? conv.fecha_cierre)}
                        {conv.fecha_prorroga && (
                          <span className="block text-xs text-[var(--app-ink-2)]">original: {formatDate(conv.fecha_cierre)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="pill" data-tone={cfg.tone} title={cfg.ayuda}>{cfg.label}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link href={`/admin/convocatorias/${conv.id}`} aria-label="Ver" title="Ver ficha y banner">
                            <Button variant="soft" size="icon-sm" aria-label="Ver" title="Ver ficha y banner">
                              <Eye />
                            </Button>
                          </Link>
                          {esAdmin && (
                          <Link href={`/admin/convocatorias/${conv.id}/editar`} aria-label="Editar" title="Editar">
                            <Button variant="soft" size="icon-sm" aria-label="Editar" title="Editar">
                              <Edit />
                            </Button>
                          </Link>
                          )}
                          {esAdmin && puedeProrrogar(conv) && (
                            <Button variant="secondary" size="icon-sm" aria-label="Dar prórroga" title="Dar prórroga" onClick={() => setProrroga(conv)}>
                              <CalendarPlus />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {prorroga && (
        <ProrrogaDialog
          convocatoria={prorroga}
          open={Boolean(prorroga)}
          onClose={() => setProrroga(null)}
          onDone={(c) => {
            setLista((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...c } : x)));
            setProrroga(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
