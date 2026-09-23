'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import type { Solicitud } from '@/types/api';
import {
  FolderOpen, PlusCircle, Clock, CheckCircle2, ArrowRight,
  FileText, Loader2, AlertCircle, TrendingUp, LayoutDashboard,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useMinLoadingDuration } from '@/hooks/useMinLoadingDuration';
import PageHeader from '@/components/ui/page-header';
import StatTile, { type TileTone } from '@/components/ui/stat-tile';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export default function SolicitanteDashboard() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoadingDuration(loading, 400);

  useEffect(() => {
    api.get('/solicitudes')
      .then(({ data }) => setSolicitudes(Array.isArray(data) ? data : []))
      .catch(() => setSolicitudes([]))
      .finally(() => setLoading(false));
  }, []);

  const total = solicitudes.length;
  const borradores = solicitudes.filter(s => s.estado === 'borrador').length;
  const enProceso = solicitudes.filter(s =>
    !['borrador', 'aprobada', 'convenio', 'ministracion', 'cerrada', 'cancelada'].includes(s.estado)
  ).length;
  const aprobadas = solicitudes.filter(s =>
    ['aprobada', 'convenio', 'ministracion', 'cerrada'].includes(s.estado)
  ).length;

  const stats: { label: string; value: number; icon: typeof FolderOpen; tone: TileTone; hint: string; solid?: boolean }[] = [
    { label: 'Solicitudes', value: total, icon: FolderOpen, tone: 'vino', hint: 'Todas las que has registrado', solid: true },
    { label: 'Borradores', value: borradores, icon: FileText, tone: 'gold', hint: 'Esperan tu envío' },
    { label: 'En proceso', value: enProceso, icon: Clock, tone: 'sky', hint: 'En revisión o evaluación' },
    { label: 'Aprobadas', value: aprobadas, icon: CheckCircle2, tone: 'emerald', hint: 'Con apoyo otorgado' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi panel"
        description="Revisa en qué va cada una de tus solicitudes y crea una nueva cuando haya una convocatoria abierta."
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Link href="/solicitante/solicitudes/nueva">
            <Button variant="rainbow">
              <PlusCircle className="h-4 w-4" />
              Nueva solicitud
            </Button>
          </Link>
        }
      />

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} variants={item}>
              <StatTile
                label={s.label}
                value={<AnimatedNumber value={s.value} />}
                icon={<Icon className="h-5 w-5" />}
                tone={s.tone}
                hint={s.hint}
                href="/solicitante/solicitudes"
                solid={s.solid}
                loading={showLoading}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {!loading && solicitudes.some(s => s.estado === 'observada') && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="app-card rounded-[22px] flex items-start gap-3 px-5 py-4"
          style={{ backgroundColor: 'var(--tile-gold-bg)' }}
        >
          <span className="app-tile-icon shrink-0" style={{ color: 'var(--tile-gold-fg)' }}>
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--app-ink)]">Tienes solicitudes con observaciones</p>
            <p className="text-sm text-[var(--app-ink-2)] mt-0.5">
              El equipo de revisión te pidió correcciones.{' '}
              <Link href="/solicitante/solicitudes" className="underline font-semibold text-[var(--app-ink)]">Ver mis solicitudes</Link>
            </p>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Card>
          <CardHeader>
            <CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
              Actividad reciente
            </CardTitle>
            <CardDescription>Tus últimas solicitudes y el estado en que se encuentran.</CardDescription>
            <CardAction>
              <Link href="/solicitante/solicitudes">
                <Button variant="soft" size="sm">
                  Ver todas <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {showLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--auth-vino)' }} />
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="empty-state">
                <span className="tone-chip" data-tone="violet"><FileText aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">Todavía no tienes solicitudes</p>
                <p className="text-sm text-[var(--app-ink-2)]">Crea la primera desde &quot;Nueva solicitud&quot;.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--app-rule)]">
                {solicitudes.slice(0, 6).map((sol, i) => (
                  <motion.div
                    key={sol.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + i * 0.05 }}
                    className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-[var(--auth-field)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold text-[var(--app-ink-2)] bg-[var(--auth-field)] px-2 py-0.5 rounded-md">
                          {sol.folio}
                        </span>
                        <span className={estadoBadgeClass(sol.estado)}>
                          {estadoLabel(sol.estado)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--app-ink)] truncate">
                        {sol.titulo_proyecto}
                      </p>
                      <p className="text-xs text-[var(--app-ink-2)] mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {sol.updated_at ? new Date(sol.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <Link href={`/solicitante/solicitudes/${sol.id}`} className="shrink-0">
                      <Button variant="soft" size="sm">
                        Ver <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {!loading && solicitudes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="app-card rounded-[22px] p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          data-tone="solid"
        >
          <div>
            <p className="text-lg font-extrabold">¿Lista tu institución para pedir un apoyo?</p>
            <p className="text-white/75 text-sm mt-1">Crea tu primera solicitud y empieza el proceso de evaluación.</p>
          </div>
          <Link href="/solicitante/solicitudes/nueva" className="shrink-0">
            <Button variant="outline">
              <PlusCircle className="h-4 w-4" />
              Crear solicitud
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
