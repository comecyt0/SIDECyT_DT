'use client';

import { useState } from 'react';
import { Shapes, Inbox, List } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import BandejaClubes from '@/components/especie/BandejaClubes';

/**
 * E52 · F2 — Bandeja de clubes del revisor documental: las etapas configuradas para "revisor" o "cualquiera de los dos",
 * de las convocatorias de su alcance (sin periodos asignados ve todas). "Todos" muestra los que ya pasaron por revisión.
 */
export default function RevisorClubesPage() {
  const [vista, setVista] = useState<'pendientes' | 'todos'>('pendientes');
  return (
    <div className="space-y-8">
      <PageHeader title="Clubes" eyebrow="Apoyo en especie" icon={<Shapes className="h-5 w-5" />}
        description="Clubes escolares que esperan tu revisión. Apruébalos, pide correcciones con un plazo o recházalos." />
      <div className="seg-tabs" role="tablist" aria-label="Vista de clubes">
        {([['pendientes', 'Por revisar', Inbox], ['todos', 'Todos', List]] as const).map(([k, l, Icono]) => (
          <button key={k} type="button" role="tab" aria-selected={vista === k} onClick={() => setVista(k)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
            <Icono className="h-3.5 w-3.5" aria-hidden="true" />{l}
          </button>
        ))}
      </div>
      <BandejaClubes key={vista} vista={vista} hrefFicha={(id) => `/revisor/clubes/${id}`}
        vacio={vista === 'pendientes' ? 'No hay clubes esperando tu revisión' : 'Todavía no hay clubes enviados'} />
    </div>
  );
}
