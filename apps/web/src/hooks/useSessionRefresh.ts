'use client';

import { useEffect, useRef } from 'react';
import api from '@/lib/api';

const REFRESH_LEAD_SECONDS = 5 * 60; // refrescar 5 min antes de expirar
const MIN_DELAY_MS = 30_000;          // nunca antes de 30s

/**
 * Programa un POST /auth/refresh ~5 min antes de que expire el JWT.
 * Lee expires_at desde /auth/me (epoch seconds).
 *
 * Si el usuario deja la pestaña en background el setTimeout puede desfasarse,
 * por eso re-evaluamos al recuperar visibilidad/focus.
 */
export function useSessionRefresh(enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleFromExpiresAt = (expiresAtEpoch: number | undefined | null) => {
      clear();
      if (!expiresAtEpoch || typeof expiresAtEpoch !== 'number') return;

      const nowSec = Math.floor(Date.now() / 1000);
      const secondsUntilRefresh = expiresAtEpoch - nowSec - REFRESH_LEAD_SECONDS;
      const delayMs = Math.max(secondsUntilRefresh * 1000, MIN_DELAY_MS);

      timerRef.current = setTimeout(async () => {
        try {
          const { data } = await api.post('/auth/refresh');
          // El nuevo token llega vía cookie HttpOnly; el body trae expires_at actualizado
          scheduleFromExpiresAt(data?.expires_at);
        } catch {
          // Si el refresh falla, el interceptor de api.ts gestionará el 401 cuando llegue
        }
      }, delayMs);
    };

    const bootstrap = async () => {
      try {
        const { data } = await api.get('/auth/me');
        scheduleFromExpiresAt(data?.expires_at);
      } catch {
        // Sin sesión activa: nada que programar
      }
    };

    bootstrap();

    const onVisibility = () => {
      if (!document.hidden) bootstrap();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      clear();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [enabled]);
}
