/* eslint-disable @next/next/no-img-element -- imágenes ya optimizadas por el admin; el banner necesita dos capas */
import type { CSSProperties } from 'react';

/**
 * E50 (28/09/2026) — Imagen del banner del login según su encuadre. La MISMA pieza se usa en el login y en la
 * herramienta de /admin/carrusel, así la vista previa es exactamente lo que se verá.
 *
 * - completa: la imagen entera (object-contain) con margen, sobre un fondo: la misma imagen difuminada, claro o vino.
 * - recorte: llena el espacio (object-cover) con punto de enfoque (object-position) y zoom desde ese punto.
 */
export type Ajuste = 'completa' | 'recorte';
export type Fondo = 'desenfoque' | 'claro' | 'vino';

export interface Encuadre {
  ajuste: Ajuste;
  foco_x: number;
  foco_y: number;
  zoom: number;
  fondo: Fondo;
  margen: number;
}

export const ENCUADRE_INICIAL: Encuadre = { ajuste: 'completa', foco_x: 50, foco_y: 50, zoom: 100, fondo: 'desenfoque', margen: 0 };

const lim = (v: unknown, min: number, max: number, def: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};

/** Normaliza lo que llega de la API (el front no confía en tipos ni rangos). */
export function normalizarEncuadre(o: Partial<Record<keyof Encuadre, unknown>> | null | undefined): Encuadre {
  const v = o ?? {};
  return {
    ajuste: v.ajuste === 'recorte' ? 'recorte' : 'completa',
    foco_x: lim(v.foco_x, 0, 100, 50),
    foco_y: lim(v.foco_y, 0, 100, 50),
    zoom: lim(v.zoom, 100, 300, 100),
    fondo: v.fondo === 'claro' || v.fondo === 'vino' ? v.fondo : 'desenfoque',
    margen: lim(v.margen, 0, 30, 0),
  };
}

/** ¿El fondo que queda detrás es claro? (para elegir logo/textos oscuros o claros encima). */
export function fondoEsClaro(e: Encuadre): boolean {
  return e.ajuste === 'completa' && e.fondo === 'claro';
}

export default function BannerImagen({
  src, encuadre, className = '', activo = true,
}: { src: string; encuadre: Encuadre; className?: string; activo?: boolean }) {
  const e = encuadre;
  const capa: CSSProperties = { position: 'absolute', inset: 0 };
  if (e.ajuste === 'recorte') {
    return (
      <div className={`banner-img ${className}`} data-activo={activo} style={{ ...capa, overflow: 'hidden' }}>
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            ...capa, width: '100%', height: '100%', objectFit: 'cover',
            objectPosition: `${e.foco_x}% ${e.foco_y}%`,
            transform: `scale(${e.zoom / 100})`, transformOrigin: `${e.foco_x}% ${e.foco_y}%`,
          }}
        />
      </div>
    );
  }
  const fondo: CSSProperties = e.fondo === 'claro'
    ? { background: 'var(--banner-fondo-claro, #f7f4ef)' }
    : e.fondo === 'vino'
      ? { background: 'var(--banner-fondo-vino, #56212f)' }
      : {};
  return (
    <div className={`banner-img ${className}`} data-activo={activo} style={{ ...capa, overflow: 'hidden', ...fondo }}>
      {e.fondo === 'desenfoque' && (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{ ...capa, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)', filter: 'blur(28px) saturate(1.1) brightness(0.72)' }}
        />
      )}
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ ...capa, width: '100%', height: '100%', objectFit: 'contain', padding: `${e.margen}%` }}
      />
    </div>
  );
}
