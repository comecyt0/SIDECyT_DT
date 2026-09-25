'use client';

import { useEffect } from 'react';

/**
 * 25/09/2026 — Mientras un menú o panel desplegable ocupa la pantalla del teléfono, la página de atrás no se mueve:
 * el gesto de desplazar actúa sobre el menú (antes movía la página y el menú se quedaba quieto, sin mostrar las
 * últimas opciones). Solo en pantallas angostas (< 768 px), donde el panel se superpone a todo; en escritorio la
 * página sigue desplazable. Estilos: `html.sg-scroll-bloqueado` en styles/panel-sigae.css.
 */
export function useBloqueoScroll(activo: boolean): void {
  useEffect(() => {
    if (!activo || typeof window === 'undefined') return;
    const angosta = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 767px)').matches : false;
    if (!angosta) return;
    const html = document.documentElement;
    html.classList.add('sg-scroll-bloqueado');
    return () => { html.classList.remove('sg-scroll-bloqueado'); };
  }, [activo]);
}
