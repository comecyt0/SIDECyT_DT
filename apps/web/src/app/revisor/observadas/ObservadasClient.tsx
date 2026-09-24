'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';
import type { Solicitud } from '@/types/api';
import UserAvatar from '@/components/ui/user-avatar';

interface Props {
  solicitudes: Solicitud[];
}

export default function ObservadasClient({ solicitudes }: Props) {
  const total = solicitudes.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Con correcciones pendientes"
        description="Solicitudes que regresaste con observaciones y esperan la respuesta del solicitante."
        icon={<Clock className="h-5 w-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <Clock className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Esperan respuesta del solicitante
          </CardTitle>
          <CardDescription>
            {total === 1 ? '1 solicitud con observaciones' : `${total} solicitudes con observaciones`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {solicitudes.length === 0 ? (
            <div className="empty-state">
              <span className="tone-chip" data-tone="orange"><Clock aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">Nada pendiente por ahora</p>
              <p className="text-sm text-[var(--app-ink-2)]">Las solicitudes que regreses con observaciones aparecerán aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--app-rule)]">
              {solicitudes.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-[var(--auth-field)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--auth-vino)' }}>
                        {s.folio}
                      </span>
                      <span className={estadoBadgeClass(s.estado)}>
                        {estadoLabel(s.estado)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--app-ink)] truncate">
                      {s.titulo_proyecto}
                    </p>
                    <p className="text-xs text-[var(--app-ink-2)] mt-0.5 truncate flex items-center gap-1.5">
                      <UserAvatar user={s.user} size="xs" />
                      {s.empresa?.nombre || s.user?.name || 'Solicitante'}
                      {s.updated_at && (
                        <span className="ml-2">
                          · {new Date(s.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </p>
                  </div>
                  <Link href={`/revisor/solicitudes/${s.id}`} className="shrink-0">
                    <Button variant="soft" size="sm" title="Revisar la solicitud">
                      <Eye className="h-3.5 w-3.5" />
                      Revisar
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
