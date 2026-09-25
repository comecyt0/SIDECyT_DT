'use client';

import { useEffect, useRef, useState } from 'react';
import { PartyPopper } from 'lucide-react';

/**
 * E45 (punto 4) — Folios aprobados que el admin CONFIRMÓ publicar (GET /api/folios-aprobados). Solo el número de
 * folio, agrupado por convocatoria (decisión del usuario). Confeti cada vez que se entra o se regresa a la sección.
 *  - Datos validados antes de pintar (tipos, longitudes, patrón del folio, topes de cantidad) y pintados como texto.
 *  - Confeti propio en canvas (sin dependencias), en la paleta vino/pastel de la landing; no se lanza con
 *    `prefers-reduced-motion`.
 *  - Si no hay nada publicado, la sección no aparece.
 */
interface Grupo {
  convocatoria: string;
  ejercicio: string;
  publicado: string;
  folios: string[];
}

const FOLIO_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/ ]{0,59}$/;
const texto = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function parsear(raw: unknown): Grupo[] {
  const lista = (raw as { grupos?: unknown })?.grupos;
  if (!Array.isArray(lista)) return [];
  return lista.slice(0, 50).flatMap((g) => {
    const convocatoria = texto((g as Record<string, unknown>)?.convocatoria, 200);
    const folios = Array.isArray((g as Record<string, unknown>)?.folios)
      ? ((g as { folios: unknown[] }).folios.filter((f): f is string => typeof f === 'string' && FOLIO_RE.test(f)).slice(0, 1000))
      : [];
    if (!convocatoria || folios.length === 0) return [];
    return [{
      convocatoria,
      ejercicio: texto((g as Record<string, unknown>)?.ejercicio_fiscal, 10) ?? '',
      publicado: texto((g as Record<string, unknown>)?.publicado, 10) ?? '',
      folios,
    }];
  });
}

const COLORES = ['#7a2748', '#a8466b', '#f2c6d6', '#fdebf4', '#e3f3ff', '#def5f5', '#fff5cc', '#08304c'];

/** Confeti en un canvas temporal a pantalla completa; se quita solo al terminar. */
function lanzarConfeti() {
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

export default function FoliosAprobados() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/folios-aprobados', { credentials: 'omit', signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGrupos(parsear(d)))
      .catch(() => setGrupos([]));
    return () => ctrl.abort();
  }, []);

  // Confeti cada vez que la sección ENTRA en pantalla (al avanzar o al regresar), no solo la primera.
  useEffect(() => {
    const el = ref.current;
    if (!el || grupos.length === 0) return;
    // matchMedia puede no existir (navegadores viejos, pruebas): sin él, se asume movimiento normal.
    const reducido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dentro = false;
    let ultimo = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.3) {
        if (!dentro && !reducido && performance.now() - ultimo > 1200) {
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
  }, [grupos.length]);

  if (grupos.length === 0) return null;
  const total = grupos.reduce((n, g) => n + g.folios.length, 0);

  return (
    <section id="folios-aprobados" ref={ref} className="lp-section lp-folios-section" aria-labelledby="lp-folios">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 id="lp-folios" className="lp-h2">
            Folios aprobados <PartyPopper className="lp-folios-icono" aria-hidden="true" />
          </h2>
          <p className="lp-h2-sub">
            {total === 1 ? '1 proyecto aprobado' : `${total} proyectos aprobados`}. Si tu folio aparece aquí, revisa tu
            panel en SIGAE: ahí sigue el convenio.
          </p>
        </div>
        <div className="lp-folios">
          {grupos.map((g) => (
            <article key={g.convocatoria} className="lp-folios-grupo">
              <header>
                <h3>{g.convocatoria}</h3>
                <p>{[g.ejercicio && `Ejercicio ${g.ejercicio}`, `${g.folios.length} ${g.folios.length === 1 ? 'folio' : 'folios'}`].filter(Boolean).join(' · ')}</p>
              </header>
              <ul aria-label={`Folios aprobados de ${g.convocatoria}`}>
                {g.folios.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
