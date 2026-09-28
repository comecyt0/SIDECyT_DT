'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Órbita de sistemas del héroe del portal (E51, 28/09/2026).
 * Motivo tomado del propio logo COMECYT (arcos concéntricos con puntos): SIDECyT al centro y cada sistema como un nodo
 * en su órbita. Es interactiva, no decorativa: pasar el cursor o el foco por un nodo resalta su tarjeta abajo (y la
 * tarjeta resalta su nodo), y pulsarlo lleva a ella. Sin datos inventados: solo nombre y estado de cada sistema.
 * Estilos: `.pt-orbita*` en portal.css. Con movimiento reducido no gira ni se dibuja: queda estática y completa.
 */

export type SistemaOrbita = 'sigae' | 'sicei';

interface Nodo {
  id: SistemaOrbita;
  sigla: string;
  detalle: string;
  estado: 'disponible' | 'proximamente';
  icono: ReactNode;
  /** Posición en % del cuadro (calculada sobre la órbita: SIGAE r=200 a −35°, SICEI r=150 a 145°, centro 220/440). */
  x: number;
  y: number;
}

export default function OrbitaSistemas({
  nodos, foco, onFoco,
}: {
  nodos: Nodo[];
  foco: SistemaOrbita | null;
  onFoco: (id: SistemaOrbita | null) => void;
}) {
  return (
    <div className="pt-orbita" data-foco={foco ?? undefined}>
      <svg className="pt-orbita-svg" viewBox="0 0 440 440" aria-hidden="true" focusable="false">
        {/* Anillos base */}
        <circle className="pt-orbita-anillo" cx="220" cy="220" r="200" />
        <circle className="pt-orbita-anillo pt-orbita-anillo-2" cx="220" cy="220" r="150" />
        <circle className="pt-orbita-anillo pt-orbita-anillo-3" cx="220" cy="220" r="98" />
        {/* Arcos del logo: se dibujan una vez al cargar (pathLength=1 → dashoffset). */}
        <path className="pt-orbita-trazo" style={{ '--d': '0ms' } as CSSProperties} pathLength={1}
          d="M 60.6 99.6 A 200 200 0 0 1 379.4 99.6" />
        <path className="pt-orbita-trazo pt-orbita-trazo-dorado" style={{ '--d': '160ms' } as CSSProperties} pathLength={1}
          d="M 350 295 A 150 150 0 0 1 90 295" />
        <path className="pt-orbita-trazo pt-orbita-trazo-fino" style={{ '--d': '320ms' } as CSSProperties} pathLength={1}
          d="M 122 220 A 98 98 0 0 1 220 122" />
        {/* Conectores centro → nodo: se encienden con el foco */}
        <line className="pt-orbita-conector" data-sistema="sigae" x1="220" y1="220" x2="383.8" y2="105.3" />
        <line className="pt-orbita-conector" data-sistema="sicei" x1="220" y1="220" x2="97.1" y2="306" />
        {/* Puntos que orbitan (giro lento; se detiene con movimiento reducido) */}
        <g className="pt-orbita-giro" style={{ '--dur': '46s' } as CSSProperties}>
          <circle className="pt-orbita-punto pt-orbita-punto-dorado" cx="420" cy="220" r="5" />
        </g>
        <g className="pt-orbita-giro pt-orbita-giro-inverso" style={{ '--dur': '34s' } as CSSProperties}>
          <circle className="pt-orbita-punto" cx="220" cy="70" r="4" />
        </g>
        <g className="pt-orbita-giro" style={{ '--dur': '26s' } as CSSProperties}>
          <circle className="pt-orbita-punto pt-orbita-punto-suave" cx="318" cy="220" r="3" />
        </g>
      </svg>

      <div className="pt-orbita-centro">
        <span className="pt-orbita-centro-sigla">SIDECyT</span>
        <span className="pt-orbita-centro-sub">{nodos.length} sistemas</span>
      </div>

      {nodos.map((n) => (
        <Link
          key={n.id}
          href={`#pt-sistema-${n.id}`}
          className="pt-orbita-nodo"
          data-sistema={n.id}
          data-activo={foco === n.id || undefined}
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          onPointerEnter={() => onFoco(n.id)}
          onPointerLeave={() => onFoco(null)}
          onFocus={() => onFoco(n.id)}
          onBlur={() => onFoco(null)}
          aria-label={`${n.sigla}: ${n.detalle}. ${n.estado === 'disponible' ? 'Disponible' : 'Próximamente'}. Ir a su tarjeta`}
        >
          <span className="pt-orbita-nodo-icono" aria-hidden="true">{n.icono}</span>
          <span className="pt-orbita-nodo-texto" aria-hidden="true">
            <strong>{n.sigla}</strong>
            <span data-estado={n.estado}>{n.estado === 'disponible' ? 'Disponible' : 'Próximamente'}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
