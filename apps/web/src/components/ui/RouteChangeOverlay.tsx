'use client';

import { useEffect, useRef, useState } from 'react';
import { RouteLoadingScreen } from '@/components/ui/GlobalLoader';
import { subscribeLoading } from '@/lib/loading-bus';

/**
 * Orquesta la pantalla de carga del sistema desde tres fuentes, sin tocar el menú ni cada botón:
 *
 *  1. Recarga / primera carga de CUALQUIER página: el layout raíz imprime `#boot-splash` en el
 *     HTML del servidor (se ve antes de que cargue el JS). Aquí se retira cuando la app ya montó y
 *     pasó un mínimo de BOOT_MS desde el inicio de la navegación.
 *  2. Clic en cualquier enlace interno (`<a href="/…">`): listener global en `document`, VISIBLE_MS.
 *  3. Botones que escriben o descargan: `lib/api.ts` avisa por `loading-bus` mientras dura la
 *     petición; se garantiza un mínimo de MIN_VISIBLE_MS para que no parpadee.
 *
 * Ver docs/DISENO_UI.md §Pantalla de carga.
 */
const BOOT_MS = 1100;
const VISIBLE_MS = 1400;
const MIN_VISIBLE_MS = 1000;

export default function RouteChangeOverlay() {
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busShownAt = useRef<number | null>(null);
  const [busActive, setBusActive] = useState(false);
  const [linkActive, setLinkActive] = useState(false);

  // 1. Splash del servidor: ocultarlo cuando la app montó y pasó el mínimo. Es un nodo que
  //    React hidrató, así que NO se quita del DOM (E29): solo se oculta.
  useEffect(() => {
    const splash = document.getElementById('boot-splash');
    if (!splash) return;
    const remaining = Math.max(0, BOOT_MS - performance.now());
    const t = setTimeout(() => {
      splash.classList.add('route-loading-out');
      setTimeout(() => {
        splash.style.display = 'none';
        splash.setAttribute('aria-hidden', 'true');
      }, 220);
    }, remaining);
    return () => clearTimeout(t);
  }, []);

  // 2. Clics en enlaces internos.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // No filtrar por e.defaultPrevented: el <Link> de Next.js SIEMPRE hace preventDefault.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const href = link.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//')) return;
      const dest = new URL(href, window.location.origin);
      if (dest.pathname === window.location.pathname && dest.search === window.location.search) return;
      if (linkTimer.current) clearTimeout(linkTimer.current);
      setLinkActive(true);
      linkTimer.current = setTimeout(() => setLinkActive(false), VISIBLE_MS);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      if (linkTimer.current) clearTimeout(linkTimer.current);
    };
  }, []);

  // 3. Peticiones que escriben (bus de lib/api.ts) con mínimo visible.
  useEffect(() => {
    return subscribeLoading((pending) => {
      if (pending > 0) {
        if (busTimer.current) {
          clearTimeout(busTimer.current);
          busTimer.current = null;
        }
        if (!busShownAt.current) busShownAt.current = Date.now();
        setBusActive(true);
        return;
      }
      const elapsed = busShownAt.current ? Date.now() - busShownAt.current : MIN_VISIBLE_MS;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      busTimer.current = setTimeout(() => {
        busShownAt.current = null;
        busTimer.current = null;
        setBusActive(false);
      }, remaining);
    });
  }, []);

  const visible = linkActive || busActive;
  if (!visible) return null;
  return <RouteLoadingScreen message="Cargando…" />;
}
