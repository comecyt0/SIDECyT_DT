'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Loader2, BellOff, Check } from 'lucide-react';
import api from '@/lib/api';
import { colorMap } from '@/lib/color-mapper';
import { AlertBox } from '@/components/ui/alert-box';
import type { NotificacionLog } from '@/types/api';

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
      setFeedback({ type: 'error', message: 'Error al marcar la notificación como leída' });
    }
  };

  const marcarTodasLeidas = async () => {
    setMarkingAll(true);
    try {
      await api.post('/admin/notificaciones/leer-todas');
      router.refresh();
    } catch {
      setFeedback({ type: 'error', message: 'Error al marcar todas las notificaciones' });
    } finally {
      setMarkingAll(false);
    }
  };

  const tipoColor = (tipo: string) => {
    const tipoMap: Record<string, string> = {
      solicitud_enviada: `${colorMap.states.info.background} ${colorMap.states.info.text}`,
      dictamen_emitido: `${colorMap.states.success.background} ${colorMap.states.success.text}`,
      nueva_asignacion: `${colorMap.states.warning.background} ${colorMap.states.warning.text}`,
      observacion: `${colorMap.states.warning.background} ${colorMap.states.warning.text}`,
    };
    return tipoMap[tipo] || `${colorMap.neutral.light} text-neutral-700 dark:text-neutral-200`;
  };

  const noLeidas = notifs.filter(n => !n.leida_at).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" /> Notificaciones del Sistema
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {total} notificación(es) en total — {noLeidas} sin leer
          </p>
        </div>
        <Button
          disabled={markingAll || noLeidas === 0}
          onClick={marcarTodasLeidas}
        >
          {markingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCheck className="h-4 w-4 mr-2" />}
          Marcar todas como leídas
        </Button>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary">Historial de Notificaciones</CardTitle>
          <CardDescription>Registro de eventos del sistema — paginado por {PER_PAGE} registros</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <BellOff className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">No hay notificaciones registradas.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {notifs.map((n) => (
                <div
                  key={n.id}
                  className={`px-6 py-4 flex items-start gap-4 transition-colors ${!n.leida_at ? colorMap.states.info.background.replace('bg-', 'bg-') + '/30' : 'bg-white dark:bg-neutral-900'}`}
                >
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.leida_at ? colorMap.states.info.text.replace('text-', 'bg-') : 'bg-neutral-200'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs shadow-none ${tipoColor(n.tipo)}`}>{n.tipo}</Badge>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mt-1.5">{n.asunto}</p>
                    {n.mensaje && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{n.mensaje}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                      {n.user && <span>Usuario: <span className="font-medium text-neutral-600 dark:text-neutral-300">{n.user.name}</span></span>}
                      {n.solicitud && <span>Folio: <span className="font-mono font-medium text-primary">{n.solicitud.folio}</span></span>}
                    </div>
                  </div>
                  {!n.leida_at && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${colorMap.states.info.text} hover:${colorMap.states.info.background.replace('bg-', 'bg-')} shrink-0`}
                      title="Marcar como leída"
                      onClick={() => marcarLeida(n.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-4 p-4 border-t border-neutral-100 dark:border-neutral-700">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                ← Anterior
              </Button>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Página {page} de {lastPage}</span>
              <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => goToPage(page + 1)}>
                Siguiente →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
