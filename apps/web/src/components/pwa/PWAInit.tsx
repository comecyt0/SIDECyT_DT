'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa';

/**
 * Registra el service worker en el primer mount del layout raíz.
 * No renderiza nada. Degradación elegante si el browser no soporta SW.
 */
export default function PWAInit() {
  useEffect(() => {
    // No registrar en dev para evitar caches confusos durante HMR.
    if (process.env.NODE_ENV !== 'production') return;
    void registerServiceWorker();
  }, []);

  return null;
}
