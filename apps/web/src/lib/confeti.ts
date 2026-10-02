'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Confeti propio en canvas (sin dependencias), paleta institucional vino + colores vivos. Lo usan los folios aprobados de
 * la landing (E45) y el aviso «¡Tu club fue aceptado!» del líder (E52 · F2, rediseñado el 02/10/2026).
 *
 * Movimiento reducido (02/10/2026): antes no se lanzaba nada. En Windows Server y en escritorio remoto las animaciones del
 * sistema vienen apagadas, así que el navegador reporta `prefers-reduced-motion: reduce` y el confeti no salía. Ahora,
 * con movimiento reducido, cae una lluvia suave en toda la pantalla (sin explosión ni giros rápidos), y la versión
 * completa (cañones + explosión central + lluvia que llena la ventana) se usa cuando el sistema no pide reducir.
 */
const COLORES = ['#7a2748', '#a8466b', '#e3557f', '#f2c6d6', '#ffd23f', '#3ec7a1', '#4aa8ff', '#9b6bff', '#ff8a3d', '#08304c'];

export function movimientoReducido(): boolean {
  // matchMedia puede no existir (navegadores viejos, pruebas): sin él, se asume movimiento normal.
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Pieza { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; vr: number; color: string; forma: number; osc: number }

let activos = 0;

/** Confeti en un canvas temporal a pantalla completa; se quita solo al terminar. `fiesta` = más piezas y una lluvia extra. */
export function lanzarConfeti(opciones: { fiesta?: boolean } = {}) {
  if (typeof document === 'undefined' || activos >= 2) return;
  const suave = movimientoReducido();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.confeti = suave ? 'suave' : 'completo';
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '9999' });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  activos++;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  // Cantidad según el área de la pantalla: llena toda la ventana en teléfono y en monitor grande.
  const area = W * H;
  const base = Math.round(area / (suave ? 7000 : 2600));
  const piezas: Pieza[] = [];
  const nueva = (p: Partial<Pieza>): Pieza => ({
    x: 0, y: 0, vx: 0, vy: 0, w: 7 + Math.random() * 9, h: 10 + Math.random() * 12, rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * (suave ? 0.05 : 0.35), color: COLORES[Math.floor(Math.random() * COLORES.length)], forma: Math.floor(Math.random() * 3),
    osc: Math.random() * Math.PI * 2, ...p,
  });
  const lluvia = (n: number, vMin: number, vVar: number) => {
    // Repartida en todo el ancho y escalonada en altura: cubre la pantalla completa mientras cae.
    for (let i = 0; i < n; i++) piezas.push(nueva({ x: Math.random() * W, y: -20 - Math.random() * H * (suave ? 0.5 : 1.1), vx: (Math.random() - 0.5) * (suave ? 0 : 2), vy: vMin + Math.random() * vVar }));
  };
  if (suave) {
    // Lluvia suave desde arriba, en toda la pantalla.
    lluvia(Math.min(220, Math.max(90, base)), 2.6, 2);
  } else {
    const fiesta = opciones.fiesta === true;
    // Dos cañones desde las esquinas inferiores…
    const n = Math.min(fiesta ? 260 : 160, Math.max(90, base * 0.5));
    for (let i = 0; i < n; i++) {
      const izq = i % 2 === 0;
      piezas.push(nueva({ x: izq ? -10 : W + 10, y: H * 0.9, vx: (izq ? 1 : -1) * (5 + Math.random() * (W / 90)), vy: -(12 + Math.random() * (H / 70)) }));
    }
    if (fiesta) {
      // …una explosión al centro y una lluvia que llena toda la ventana.
      for (let i = 0; i < Math.min(140, base * 0.3); i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 6 + Math.random() * 10;
        piezas.push(nueva({ x: W / 2, y: H * 0.42, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 5 }));
      }
      lluvia(Math.min(420, Math.max(160, base)), 2.2, 3);
    }
  }

  const inicio = performance.now();
  const DUR = suave ? 4200 : opciones.fiesta ? 5600 : 3800;
  const paso = (t: number) => {
    const p = (t - inicio) / DUR;
    ctx.clearRect(0, 0, W, H);
    const alfa = Math.max(0, 1 - Math.max(0, p - 0.75) / 0.25);
    for (const c of piezas) {
      if (suave) {
        c.osc += 0.03;
        c.x += Math.sin(c.osc) * 0.4;
        c.y += c.vy;
      } else {
        c.vy += 0.28;
        c.vx *= 0.985;
        c.vy = Math.min(c.vy, 6);
        c.osc += 0.08;
        c.x += c.vx + Math.sin(c.osc) * 0.6;
        c.y += c.vy;
      }
      c.rot += c.vr;
      ctx.save();
      ctx.globalAlpha = alfa;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      if (c.forma === 1) { ctx.beginPath(); ctx.arc(0, 0, c.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else if (c.forma === 2) ctx.fillRect(-c.w / 4, -c.h, c.w / 2, c.h * 2);
      else ctx.fillRect(-c.w / 2, -c.h / 2 * Math.abs(Math.cos(c.osc)), c.w, c.h * Math.abs(Math.cos(c.osc)) + 1);
      ctx.restore();
    }
    if (p < 1) requestAnimationFrame(paso);
    else { canvas.remove(); activos--; }
  };
  requestAnimationFrame(paso);
}

/**
 * Lanza confeti cada vez que el elemento ENTRA en pantalla (al cargar, al desplazarse y al regresar), no solo la primera
 * vez, con una pausa mínima entre lanzamientos. Cuenta como "en pantalla" cuando se ve al menos el 40 % del elemento o,
 * si el elemento es más alto que la ventana, un tercio de la ventana. `activo` en falso lo desactiva.
 */
export function useConfetiAlVer(ref: RefObject<HTMLElement | null>, activo: boolean, opciones: { fiesta?: boolean } = {}) {
  const fiesta = opciones.fiesta === true;
  useEffect(() => {
    const el = ref.current;
    if (!el || !activo || typeof IntersectionObserver === 'undefined') return;
    let dentro = false;
    // -Infinity, no 0: performance.now() cuenta desde que abrió la página; con 0, si la tarjeta aparecía antes de 1.5 s
    // (lo normal al refrescar) el primer confeti se tomaba como "demasiado pronto" y no salía (bug corregido 02/10/2026).
    let ultimo = -Infinity;
    const umbrales = Array.from({ length: 21 }, (_, i) => i / 20);
    const obs = new IntersectionObserver(([e]) => {
      const alto = e.boundingClientRect.height || 1;
      const visible = e.intersectionRect.height;
      const suficiente = e.isIntersecting && visible >= Math.min(alto * 0.4, window.innerHeight / 3);
      if (suficiente) {
        if (!dentro && performance.now() - ultimo > 1500) {
          ultimo = performance.now();
          lanzarConfeti({ fiesta });
          // `data-visto` reinicia la animación de entrada de la tarjeta (CSS) cada vez que vuelve a verse.
          el.removeAttribute('data-visto');
          void el.offsetWidth;
          el.setAttribute('data-visto', '');
        }
        dentro = true;
      } else if (!e.isIntersecting || visible < Math.min(alto * 0.05, 24)) {
        dentro = false;
      }
    }, { threshold: umbrales });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, activo, fiesta]);
}
