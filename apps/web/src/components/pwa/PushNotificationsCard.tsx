'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertBox } from '@/components/ui/alert-box';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPushSubscription,
  type PushPermission,
} from '@/lib/pwa';
import { INSTITUTION } from '@/lib/institution';

type PushState =
  | 'unsupported'
  | 'blocked'
  | 'inactive'
  | 'active'
  | 'loading';

/**
 * Card para activar/desactivar Web Push.
 *
 * Mientras el backend no exponga la VAPID public key vía
 * `GET /push/vapid-public-key`, usamos NEXT_PUBLIC_VAPID_PUBLIC_KEY del
 * .env como fallback. Si tampoco existe, mostramos un aviso explicativo
 * y se desactiva el botón.
 */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export default function PushNotificationsCard() {
  const [state, setState] = useState<PushState>('loading');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Calcula el estado inicial al montar. Garantiza que NUNCA queda en 'loading'
  // permanente: si algo falla o el navegador no responde en 3s, se asume inactive.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        if (!isPushSupported()) {
          if (!cancelled) setState('unsupported');
          return;
        }
        const perm: PushPermission = getNotificationPermission();
        if (perm === 'denied') {
          if (!cancelled) setState('blocked');
          return;
        }
        const sub = await getCurrentPushSubscription();
        if (!cancelled) setState(sub ? 'active' : 'inactive');
      } catch (err) {
        console.warn('[PushNotificationsCard] init error:', err);
        if (!cancelled) setState('inactive');
      }
    };
    void init();
    // Safety net: si algo bloquea, salimos del 'loading' en 3s.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setState((curr) => (curr === 'loading' ? 'inactive' : curr));
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const handleEnable = async () => {
    setMessage(null);
    setState('loading');

    const perm = await requestNotificationPermission();
    if (perm === 'denied') {
      setState('blocked');
      setMessage({ type: 'error', text: 'El navegador bloqueó las notificaciones. Habilítalas en la configuración del sitio.' });
      return;
    }
    if (perm !== 'granted') {
      setState('inactive');
      setMessage({ type: 'info', text: 'Se requiere permiso para activar las notificaciones.' });
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setState('inactive');
      setMessage({
        type: 'info',
        text: `Las notificaciones push aún no están configuradas en el servidor. El equipo ${INSTITUTION.name} lo habilitará próximamente.`,
      });
      return;
    }

    try {
      const sub = await subscribeToPush(VAPID_PUBLIC_KEY);
      if (sub) {
        setState('active');
        setMessage({ type: 'success', text: 'Notificaciones push activadas correctamente.' });
      } else {
        setState('inactive');
        setMessage({ type: 'error', text: 'No fue posible crear la suscripción push.' });
      }
    } catch (err) {
      console.warn('[PushNotificationsCard] subscribe error:', err);
      setState('inactive');
      setMessage({ type: 'error', text: 'Ocurrió un error al activar las notificaciones.' });
    }
  };

  const handleDisable = async () => {
    setMessage(null);
    setState('loading');
    try {
      const ok = await unsubscribeFromPush();
      setState('inactive');
      if (ok) {
        setMessage({ type: 'success', text: 'Notificaciones push desactivadas.' });
      } else {
        setMessage({ type: 'error', text: 'No fue posible desactivar la suscripción.' });
      }
    } catch (err) {
      console.warn('[PushNotificationsCard] unsubscribe error:', err);
      setState('inactive');
      setMessage({ type: 'error', text: 'Ocurrió un error al desactivar las notificaciones.' });
    }
  };

  const renderBadge = () => {
    switch (state) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200 shadow-none">Activado</Badge>;
      case 'inactive':
        return <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200 shadow-none">Desactivado</Badge>;
      case 'blocked':
        return <Badge className="bg-red-100 text-red-800 border-red-200 shadow-none">Bloqueado por el navegador</Badge>;
      case 'unsupported':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 shadow-none">No soportado</Badge>;
      case 'loading':
      default:
        return <Badge className="bg-neutral-100 text-neutral-500 border-neutral-200 shadow-none">Cargando…</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
      <CardHeader className="bg-neutral-50 border-b border-neutral-100 pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Notificaciones push del navegador
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-neutral-600">
            <p className="font-medium text-neutral-800">Estado actual</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Recibe alertas del sistema aún cuando la pestaña esté cerrada.
            </p>
          </div>
          {renderBadge()}
        </div>

        {message && (
          <AlertBox type={message.type} message={message.text} />
        )}

        {state === 'unsupported' && (
          <p className="text-xs text-neutral-500">
            Tu navegador no soporta notificaciones push. Considera usar Chrome, Edge o Firefox en su versión más reciente.
          </p>
        )}

        {state === 'blocked' && (
          <p className="text-xs text-neutral-500">
            Has bloqueado las notificaciones para este sitio. Para reactivarlas, ajusta los permisos del sitio en tu navegador.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleEnable}
            disabled={state === 'loading' || state === 'active' || state === 'blocked' || state === 'unsupported'}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {state === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando…
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Activar push
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDisable}
            disabled={state !== 'active'}
          >
            <BellOff className="h-4 w-4 mr-2" />
            Desactivar push
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
