'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { getEcho } from '@/lib/echo';

export interface Notificacion {
  id: string | number;
  asunto: string;
  mensaje?: string;
  leida_at?: string;
  created_at?: string;
}

const DEFAULT_POLL_MS = 60_000;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface UseNotificationsOptions {
  endpoint?: string;
  /** Base path for mark-as-read endpoints. Admin usa /admin/notificaciones, el resto /mis-notificaciones. */
  basePath?: string;
  pollMs?: number;
  enabled?: boolean;
}

export function useNotifications({
  endpoint = '/mis-notificaciones?all=true',
  basePath = '/mis-notificaciones',
  pollMs = DEFAULT_POLL_MS,
  enabled = true,
}: UseNotificationsOptions = {}) {
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [count, setCount] = useState(0);
  const stopped = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    stopped.current = false;

    const fetchOnce = async () => {
      try {
        const { data } = await api.get(endpoint);
        const list: Notificacion[] = Array.isArray(data) ? data : (data?.data ?? []);
        if (stopped.current) return;
        setNotifs(list.slice(0, 5));
        setCount(list.filter((n) => !n.leida_at).length);
      } catch {
        // silencioso: no romper la UI por una caída transitoria de red
      }
    };

    fetchOnce();

    const refreshOnFocus = () => {
      if (!document.hidden) fetchOnce();
    };
    document.addEventListener('visibilitychange', refreshOnFocus);
    window.addEventListener('focus', refreshOnFocus);

    const intervalId = window.setInterval(fetchOnce, pollMs);

    // ── Layer en tiempo real (Reverb/Echo) ────────────────────────────
    // Si las env vars no están definidas, getEcho() devuelve null y nos
    // quedamos sólo con el polling — degradación elegante.
    let cleanupRealtime: (() => void) | null = null;
    (async () => {
      try {
        const meRes = await api.get('/auth/me');
        const userId = meRes?.data?.user?.id;
        const echo = userId ? getEcho(API_BASE) : null;
        if (!echo || !userId) return;

        const channel = echo.private(`user.${userId}`);
        channel.listen('.notification.created', () => {
          // Cuando llega una nueva notificación, refetch para mantener orden + leida_at
          fetchOnce();
        });
        cleanupRealtime = () => {
          try {
            echo.leave(`user.${userId}`);
          } catch {
            // ignorar
          }
        };
      } catch {
        // Sin sesión o Reverb no disponible → caemos al polling
      }
    })();

    return () => {
      stopped.current = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshOnFocus);
      window.removeEventListener('focus', refreshOnFocus);
      cleanupRealtime?.();
    };
  }, [endpoint, pollMs, enabled]);

  /** Marca una notificación como leída con optimistic update. */
  const markAsRead = async (id: Notificacion['id']) => {
    const stamp = new Date().toISOString();
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida_at: n.leida_at ?? stamp } : n)));
    setCount((prev) => Math.max(prev - 1, 0));
    try {
      await api.post(`${basePath}/${id}/leer`);
    } catch {
      // Revertir si falla
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida_at: undefined } : n)));
      setCount((prev) => prev + 1);
    }
  };

  /** Marca todas las notificaciones del usuario como leídas. */
  const markAllAsRead = async () => {
    const stamp = new Date().toISOString();
    const prevCount = count;
    setNotifs((prev) => prev.map((n) => ({ ...n, leida_at: n.leida_at ?? stamp })));
    setCount(0);
    try {
      await api.post(`${basePath}/leer-todas`);
    } catch {
      // Revertir si falla
      setCount(prevCount);
    }
  };

  return { notifs, count, markAsRead, markAllAsRead };
}
