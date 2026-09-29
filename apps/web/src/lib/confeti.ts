'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Confeti propio en canvas (sin dependencias), paleta vino/pastel. Lo usan los folios aprobados de la landing (E45) y el
 * panel del líder cuando su club está aceptado (E52 · F2). Respeta `prefers-reduced-motion` (no se lanza).
 */
const COLORES = ['#7a2748', '#a8466b', '#f2c6d6', '#fdebf4', '#e3f3ff', '#def5f5', '#fff5cc', '#08304c'];

export function movimientoReducido(): boolean {
  // matchMedia puede no existir (navegadores viejos, pruebas): sin él, se asume movimiento normal.
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Confeti en un canvas temporal a pantalla completa; se quita solo al terminar. */
export function lanzarConfeti() {
  if (movimientoReducido()) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '60' });
  document.body.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const piezas = Array.from({ length: Math.min(160, Math.round(W / 6)) }, (_, i) => {
    const desdeIzq = i % 2 === 0;
    return {
      x: desdeIzq ? W * 0.15 : W * 0.85,
      y: H * 0.35,
      vx: (desdeIzq ? 1 : -1) * (2 + Math.random() * 6),
      vy: -(6 + Math.random() * 7),
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORES[i % COLORES.length],
      forma: i % 3, // 0 rectángulo, 1 círculo, 2 tira
    };
  });
  const inicio = performance.now();
  const DUR = 2600;
  const paso = (t: number) => {
    const p = (t - inicio) / DUR;
    ctx.clearRect(0, 0, W, H);
    for (const c of piezas) {
      c.vy += 0.22;
      c.vx *= 0.99;
      c.x += c.vx;
      c.y += c.vy;
      c.rot += c.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.7) / 0.3);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      if (c.forma === 1) { ctx.beginPath(); ctx.arc(0, 0, c.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else if (c.forma === 2) ctx.fillRect(-c.w / 4, -c.h, c.w / 2, c.h * 2);
      else ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    if (p < 1) requestAnimationFrame(paso);
    else canvas.remove();
  };
  requestAnimationFrame(paso);
}

/**
 * Lanza confeti cada vez que el elemento ENTRA en pantalla (al cargar, al desplazarse y al regresar), no solo la primera
 * vez, con una pausa mínima entre lanzamientos. `activo` en falso lo desactiva.
 */
export function useConfetiAlVer(ref: RefObject<HTMLElement | null>, activo: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !activo || typeof IntersectionObserver === 'undefined') return;
    let dentro = false;
    let ultimo = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.3) {
        if (!dentro && performance.now() - ultimo > 1200) {
          ultimo = performance.now();
          lanzarConfeti();
        }
        dentro = true;
      } else if (!e.isIntersecting || e.intersectionRatio < 0.05) {
        dentro = false;
      }
    }, { threshold: [0, 0.05, 0.3] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, activo]);
}
