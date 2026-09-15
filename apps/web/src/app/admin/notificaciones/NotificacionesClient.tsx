'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/page-header';
import { TILE_TONE_VARS, type TileTone } from '@/components/ui/stat-tile';
import { Bell, CheckCheck, Loader2, BellOff, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import type { NotificacionLog } from '@/types/api';

const TIPO_NOTIFICACION: Record<string, { label: string; tone: TileTone }> = {
  solicitud_enviada: { label: 'Solicitud enviada', tone: 'sky' },
  dictamen_emitido: { label: 'Dictamen emitido', tone: 'emerald' },
  nueva_asignacion: { label: 'Nueva asignación', tone: 'gold' },
  observacion: { label: 'Observación', tone: 'gold' },
};

const tipoInfo = (tipo: string) => {
  if (TIPO_NOTIFICACION[tipo]) return TIPO_NOTIFICACION[tipo];
  const raw = tipo.replace(/[._]+/g, ' ').trim();
  return { label: raw.charAt(0).toUpperCase() + raw.slice(1), tone: 'vino' as TileTone };
};

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface Props {
  notifs: NotificacionLog[];
  pagination: PaginationMeta;
}

export default function NotificacionesClient({ notifs, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [markingAll, setMarkingAll] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);

  const page = pagination.current_page;
  const lastPage = pagination.last_page;
  const total = pagination.total;
  const PER_PAGE = pagination.per_page;

  const goToPage = (next: number) => {
    if (next < 1 || next > lastPage) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', String(next));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const marcarLeida = async (id: number) => {
    try {
      await api.post(`/admin/notificaciones/${id}/leer`);
      router.refresh();
    } catch {
      setFeedback({ type: 'error', message: 'No se pudo marcar la notificación como leída. Inténtalo de nuevo.' });
    }
  };

  const marcarTodasLeidas = async () => {
    setMarkingAll(true);
    try {
      await api.post('/admin/notificaciones/leer-todas');
      router.refresh();
    } catch {
      setFeedback({ type: 'error', message: 'No se pudieron marcar las notificaciones como leídas. Inténtalo de nuevo.' });
    } finally {
      setMarkingAll(false);
    }
  };

  const noLeidas = notifs.filter(n => !n.leida_at).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <PageHeader
        title="Notificaciones del sistema"
        description={`Avisos que el sistema envió a las personas usuarias. ${total} en total, ${noLeidas} sin leer en esta página.`}
        icon={<Bell className="h-5 w-5" />}
        actions={
          <Button disabled={markingAll || noLeidas === 0} onClick={marcarTodasLeidas}>
            {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Marcar todas como leídas
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <Bell className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Historial
          </CardTitle>
          <CardDescription>Las más recientes primero. Se muestran {PER_PAGE} por página.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {notifs.length === 0 ? (
            <div className="text-center py-14">
              <BellOff className="mx-auto h-10 w-10 mb-3 text-[var(--app-ink-2)]" aria-hidden="true" />
              <p className="font-semibold text-[var(--app-ink)]">Sin notificaciones todavía</p>
              <p className="text-sm text-[var(--app-ink-2)]">Aparecen cuando el sistema envía un aviso a alguna persona usuaria.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--app-rule)]">
              {notifs.map((n) => {
                const tipo = tipoInfo(n.tipo);
                const tone = TILE_TONE_VARS[tipo.tone];
                return (
                  <div
                    key={n.id}
                    className="px-5 sm:px-6 py-4 flex items-start gap-4 transition-colors"
                    style={{ backgroundColor: !n.leida_at ? 'var(--tile-sky-bg)' : undefined }}
                  >
                    <div className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: !n.leida_at ? 'var(--tile-sky-fg)' : 'var(--app-rule)' }} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" style={{ backgroundColor: tone.bg, color: tone.fg, borderColor: 'transparent' }}>{tipo.label}</Badge>
                        <span className="text-xs text-[var(--app-ink-2)]">{n.created_at ? new Date(n.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--app-ink)] mt-1.5">{n.asunto}</p>
                      {n.mensaje && <p className="text-xs text-[var(--app-ink-2)] mt-1">{n.mensaje}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--app-ink-2)] flex-wrap">
                        {n.user && <span>Para: <span className="font-medium text-[var(--app-ink)]">{n.user.name}</span></span>}
                        {n.solicitud && <span>Folio: <span className="font-mono font-medium" style={{ color: 'var(--auth-vino)' }}>{n.solicitud.folio}</span></span>}
                      </div>
                    </div>
                    {!n.leida_at && (
                      <Button
                        variant="soft"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label="Marcar como leída"
                        title="Marcar como leída"
                        onClick={() => marcarLeida(n.id)}
                      >
                        <Check />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-4 p-4 border-t border-[var(--app-rule)]">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              <span className="text-sm text-[var(--app-ink-2)]">Página {page} de {lastPage}</span>
              <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => goToPage(page + 1)}>
                Siguiente <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
