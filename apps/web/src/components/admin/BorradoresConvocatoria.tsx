'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FilePen, Trash2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDateTime } from '@/lib/format';

interface Borrador { id: number; nombre: string | null; paso: number; updated_at: string }

const PASOS = ['Convocatoria', 'Programa', 'Preguntas', 'Documentos', 'Conceptos de gasto', 'Criterios', 'Revisión'];

/**
 * E47: borradores del asistente "Nueva convocatoria" del usuario actual (el servidor solo devuelve los propios).
 * No se pinta nada si no hay borradores.
 */
export default function BorradoresConvocatoria() {
  const [items, setItems] = useState<Borrador[]>([]);
  const [borrar, setBorrar] = useState<Borrador | null>(null);

  useEffect(() => {
    api.get('/admin/asistente-convocatoria/borradores')
      .then(({ data }) => setItems(Array.isArray(data) ? data.filter((b) => Number.isInteger(b?.id)) : []))
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  const eliminar = async (b: Borrador) => {
    try {
      await api.delete(`/admin/asistente-convocatoria/borradores/${b.id}`);
      setItems((xs) => xs.filter((x) => x.id !== b.id));
    } catch { /* se queda en la lista; el usuario puede reintentar */ }
  };

  return (
    <section className="rounded-[28px] border bg-white p-5 sm:p-6 dark:bg-neutral-900" style={{ borderColor: 'var(--app-rule)' }} aria-labelledby="borradores-titulo">
      <h2 id="borradores-titulo" className="flex items-center gap-2 text-lg font-semibold text-[var(--app-ink)]">
        <FilePen className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />
        Borradores sin terminar ({items.length})
      </h2>
      <p className="mt-1 text-sm text-[var(--app-ink-2)]">Convocatorias que empezaste a capturar. Se guardan solas mientras trabajas; retómalas donde las dejaste.</p>
      <ul className="mt-4 divide-y" style={{ borderColor: 'var(--app-rule)' }}>
        {items.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--app-ink)]">{b.nombre || 'Convocatoria sin nombre'}</p>
              <p className="text-xs text-[var(--app-ink-2)]">
                Ibas en el paso {b.paso} de 7 ({PASOS[b.paso - 1] ?? '—'}) · guardado {formatDateTime(b.updated_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/convocatorias/nueva?borrador=${b.id}`}>
                <Button size="sm">Continuar <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              </Link>
              <Button size="icon-sm" variant="destructive" aria-label={`Eliminar borrador ${b.nombre ?? ''}`} title="Eliminar borrador" onClick={() => setBorrar(b)}>
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={borrar !== null}
        title="Eliminar borrador"
        description={`Se borrará «${borrar?.nombre || 'Convocatoria sin nombre'}» y lo que capturaste en él. No se puede deshacer.`}
        onConfirm={() => { if (borrar) void eliminar(borrar); setBorrar(null); }}
        onCancel={() => setBorrar(null)}
        variant="destructive"
      />
    </section>
  );
}
