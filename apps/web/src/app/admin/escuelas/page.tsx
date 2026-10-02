'use client';

import { useCallback, useEffect, useState } from 'react';
import { School, List, Inbox } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import CatalogoEscuelas from '@/components/admin/escuelas/CatalogoEscuelas';
import SolicitudesEscuelas from '@/components/admin/escuelas/SolicitudesEscuelas';
import { useRol } from '@/hooks/useRol';

/**
 * E52 · F1 — Escuelas para «Apoyo en especie». E55: dos pestañas — «Catálogo» (solo admin: alta, Excel, participación
 * previa con temporadas) y «Solicitudes de registro» (admin y admin de convocatoria, con contador de pendientes; el
 * enlace de la campana y del correo abre ?tab=solicitudes).
 */
export default function EscuelasPage() {
  const { esAdmin } = useRol();
  const [tab, setTab] = useState<'catalogo' | 'solicitudes'>('catalogo');
  const [pendientes, setPendientes] = useState<number | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'solicitudes') setTab('solicitudes');
  }, []);
  const vista = esAdmin ? tab : 'solicitudes';
  const alContar = useCallback((n: number) => setPendientes(n), []);

  return (
    <div className="space-y-8">
      <PageHeader title="Escuelas" eyebrow="Apoyo en especie"
        description={esAdmin
          ? 'Catálogo del que los líderes eligen la escuela de su club, y las solicitudes de registro de escuelas que aún no están en él.'
          : 'Solicitudes de registro de escuelas que hicieron los líderes de clubes de tus convocatorias.'}
        icon={<School className="h-5 w-5" />} />
      {esAdmin && (
        <div className="seg-tabs" role="tablist" aria-label="Escuelas">
          <button type="button" role="tab" aria-selected={vista === 'catalogo'} onClick={() => setTab('catalogo')} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
            <List className="h-3.5 w-3.5" aria-hidden="true" />Catálogo
          </button>
          <button type="button" role="tab" aria-selected={vista === 'solicitudes'} onClick={() => setTab('solicitudes')} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
            <Inbox className="h-3.5 w-3.5" aria-hidden="true" />Solicitudes de registro{pendientes ? <span className="pill" data-tone="vino">{pendientes}</span> : null}
          </button>
        </div>
      )}
      {vista === 'catalogo' ? <CatalogoEscuelas /> : <SolicitudesEscuelas onConteo={alContar} />}
    </div>
  );
}
