'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, PlusCircle, Search, Clock, FolderOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Solicitud } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';
import PageHeader from '@/components/ui/page-header';
import StatTile, { type TileTone } from '@/components/ui/stat-tile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

interface Props {
  solicitudes: Solicitud[];
}

export default function SolicitudesClient({ solicitudes }: Props) {
  const [search, setSearch] = useState('');

  const filtered = Array.isArray(solicitudes) ? solicitudes.filter((s) =>
    s.folio?.toLowerCase().includes(search.toLowerCase()) ||
    s.titulo_proyecto?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const total = solicitudes.length;
  const borradores = solicitudes.filter(s => s.estado === 'borrador').length;
  const enProceso = solicitudes.filter(s => ['enviada', 'en_revision', 'en_evaluacion', 'observada'].includes(s.estado)).length;
  const aprobadas = solicitudes.filter(s => ['aprobada', 'convenio', 'ministracion', 'cerrada'].includes(s.estado)).length;

  const miniStats: { label: string; value: number; icon: typeof FolderOpen; tone: TileTone; hint: string; solid?: boolean }[] = [
    { label: 'Solicitudes', value: total, icon: FolderOpen, tone: 'vino', hint: 'Todas las que has registrado', solid: true },
    { label: 'Borradores', value: borradores, icon: FileText, tone: 'gold', hint: 'Esperan tu envío' },
    { label: 'En proceso', value: enProceso, icon: Clock, tone: 'sky', hint: 'En revisión o evaluación' },
    { label: 'Aprobadas', value: aprobadas, icon: CheckCircle2, tone: 'emerald', hint: 'Con apoyo otorgado' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mis solicitudes"
        description={`Aquí están todas las solicitudes que has registrado en ${INSTITUTION.name}. Abre una para ver su avance o completar lo que falte.`}
        icon={<FolderOpen className="h-5 w-5" />}
        actions={
          <Link href="/solicitante/solicitudes/nueva">
            <Button variant="rainbow">
              <PlusCircle className="h-4 w-4" />
              Nueva solicitud
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {miniStats.map((s) => {
          const Icon = s.icon;
          return (
            <StatTile
              key={s.label}
              label={s.label}
              value={s.value}
              icon={<Icon className="h-5 w-5" />}
              tone={s.tone}
              hint={s.hint}
              solid={s.solid}
            />
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>
                <FolderOpen className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
                Historial
              </CardTitle>
              <CardDescription>
                {filtered.length === 1 ? '1 solicitud' : `${filtered.length} solicitudes`}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-ink-2)] pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar por folio o título"
                aria-label="Buscar por folio o título"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="auth-input auth-input-static pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="tone-chip" data-tone={search ? 'sky' : 'violet'}>
                {search ? <Search aria-hidden="true" /> : <FileText aria-hidden="true" />}
              </span>
              <p className="font-bold text-[var(--app-ink)]">
                {search ? 'No encontramos resultados' : 'Todavía no tienes solicitudes'}
              </p>
              <p className="text-sm text-[var(--app-ink-2)]">
                {search ? 'Prueba con otro folio u otra palabra del título.' : 'Crea la primera desde "Nueva solicitud".'}
              </p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="divide-y divide-[var(--app-rule)]">
              {filtered.map((s) => (
                <motion.div
                  key={s.id}
                  variants={item}
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-[var(--auth-field)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] font-bold text-[var(--app-ink-2)] bg-[var(--auth-field)] px-2 py-0.5 rounded-md">
                        {s.folio}
                      </span>
                      <span className={estadoBadgeClass(s.estado)}>
                        {estadoLabel(s.estado)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--app-ink)] truncate">
                      {s.titulo_proyecto}
                    </p>
                    <p className="text-xs text-[var(--app-ink-2)] mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.updated_at
                        ? new Date(s.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'
                      }
                    </p>
                  </div>
                  <Link href={`/solicitante/solicitudes/${s.id}`} className="shrink-0">
                    <Button variant="soft" size="sm">
                      Ver <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
