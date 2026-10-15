'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue,
} from 'framer-motion';

/**
 * Efectos ligados al scroll del portal SIDECyT (15/10/2026, pedido del usuario: "creación de contenido con el scroll,
 * desvanecido mientras haces scroll e image sequence scrubbing mapeado con el scroll").
 *
 * Reglas (emil-design-eng / hallmark):
 * - Solo `transform` y `opacity` (y `pathLength` en SVG). Valores de framer-motion: no hay re-render por cuadro.
 * - Nada se oculta antes de montar: el HTML del servidor sale completo y visible (sin JS = página legible).
 * - Con `prefers-reduced-motion` no hay ningún efecto ligado al scroll: todo estático y visible.
 * - Reversible: al subir, el efecto regresa (es scrubbing, no una animación de una vez).
 */

/** true tras montar en el cliente y sin movimiento reducido. */
function useScrollVivo(): boolean {
  const reducir = useReducedMotion();
  const [montado, setMontado] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setMontado(true), 0); return () => window.clearTimeout(t); }, []);
  return montado && !reducir;
}

/** Barra fina de progreso de lectura (vino), bajo la barra de navegación. */
export function BarraProgreso() {
  const { scrollYProgress } = useScroll();
  const escala = useSpring(scrollYProgress, { stiffness: 180, damping: 32, mass: 0.4 });
  const vivo = useScrollVivo();
  if (!vivo) return null;
  return <motion.span className="pt-progreso" style={{ scaleX: escala }} aria-hidden="true" />;
}

/**
 * Bloque que se "construye" al entrar con el scroll: sube, se aclara y toma su escala conforme avanza (y vuelve al
 * subir). `salida` además lo desvanece al irse por arriba.
 */
export function AparecerScroll({ children, className, salida = false, id, ...resto }: {
  children: ReactNode; className?: string; salida?: boolean; id?: string; 'aria-labelledby'?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const vivo = useScrollVivo();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.98', 'start 0.55'] });
  const { scrollYProgress: fin } = useScroll({ target: ref, offset: ['end 0.35', 'end 0'] });
  const entra = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.5 });
  const opEntra = useTransform(entra, [0, 1], [0.12, 1]);
  const opSale = useTransform(fin, [0, 1], [1, salida ? 0.25 : 1]);
  const opacity = useTransform(() => opEntra.get() * opSale.get());
  const y = useTransform(entra, [0, 1], [48, 0]);
  const scale = useTransform(entra, [0, 1], [0.97, 1]);
  return (
    <motion.div ref={ref} id={id} className={className} style={vivo ? { opacity, y, scale } : undefined} {...resto}>
      {children}
    </motion.div>
  );
}

/** Palabra cuyo color se "llena" según su tramo del progreso (texto que se escribe con el scroll). */
function Palabra({ p, desde, hasta, children }: { p: MotionValue<number>; desde: number; hasta: number; children: string }) {
  const opacity = useTransform(p, [desde, hasta], [0.16, 1]);
  return <motion.span className="pt-palabra" style={{ opacity }}>{children}</motion.span>;
}

/**
 * Título que se arma palabra por palabra con el scroll. El texto completo queda en el DOM (lectores de pantalla y
 * buscadores lo leen entero); solo cambia la opacidad de cada palabra.
 */
export function TextoScroll({ texto, como: Etiqueta = 'h2', className, id }: { texto: string; como?: 'h2' | 'p'; className?: string; id?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const vivo = useScrollVivo();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'start 0.5'] });
  const palabras = texto.split(' ');
  return (
    <Etiqueta ref={ref} id={id} className={className}>
      {vivo
        ? palabras.map((w, i) => (
          <span key={`${w}-${i}`}>
            <Palabra p={scrollYProgress} desde={i / palabras.length} hasta={(i + 1) / palabras.length}>{w}</Palabra>
            {i < palabras.length - 1 ? ' ' : ''}
          </span>
        ))
        : texto}
    </Etiqueta>
  );
}

/** Desvanecido del héroe al bajar: el texto sube y se aclara; los personajes se alejan un poco más rápido. */
export function useSalidaHeroe() {
  const ref = useRef<HTMLElement>(null);
  const vivo = useScrollVivo();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const opIlus = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const yIlus = useTransform(scrollYProgress, [0, 1], [0, -140]);
  return {
    ref,
    texto: vivo ? { opacity, y } : undefined,
    ilustracion: vivo ? { opacity: opIlus, y: yIlus } : undefined,
  };
}

/* ═══════════ "Cómo funciona": secuencia ilustrada fijada y mapeada al scroll (scrubbing) ═══════════ */

export interface PasoSecuencia { titulo: string; texto: string; tono: 'azul' | 'ciruela' | 'terracota'; icono: ReactNode }

/** Puntos del camino (coordenadas del viewBox 0 0 520 420) donde está cada paso. */
const NODOS = [{ x: 70, y: 300 }, { x: 230, y: 150 }, { x: 390, y: 250 }];
const CAMINO = 'M 70 300 C 120 300, 150 150, 230 150 S 330 250, 390 250 S 450 140, 452 120';

/**
 * Escena de la secuencia: un camino dorado que se dibuja, tres estaciones que se encienden, un engrane que gira y un
 * matraz que se llena hasta desbordar confeti al final. Cada valor sale de `p` (0..1): es un "image sequence" hecho con
 * vectores (nítido en cualquier pantalla y sin descargar cientos de fotogramas).
 */
function Escena({ p }: { p: MotionValue<number> }) {
  const trazo = useTransform(p, [0.02, 0.92], [0, 1]);
  const giro = useTransform(p, [0, 1], [0, 540]);
  const nivel = useTransform(p, [0.1, 0.95], [96, 0]); // desplazamiento del líquido (96 = vacío)
  const burbujas = useTransform(p, [0.45, 0.6], [0, 1]);
  const fiesta = useTransform(p, [0.86, 0.98], [0, 1]);
  const fiestaEsc = useTransform(p, [0.86, 0.98], [0.4, 1]);
  const n0 = useTransform(p, [0.0, 0.08], [0, 1]);
  const n1 = useTransform(p, [0.36, 0.44], [0, 1]);
  const n2 = useTransform(p, [0.7, 0.78], [0, 1]);
  const nodos = [n0, n1, n2];
  const tonos = ['il-f-azul-solido', 'il-f-ciruela-solido', 'il-f-terracota-solido'];
  return (
    <svg className="il-svg pt-secuencia-svg" viewBox="0 0 520 420" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="pt-matraz-clip">
          <path d="M26 0 L26 26 L-4 92 Q-9 106 4 108 L76 108 Q89 106 84 92 L54 26 L54 0 Z" />
        </clipPath>
      </defs>
      {/* Camino base punteado y camino dorado que se dibuja con el scroll */}
      <path d={CAMINO} className="pt-secuencia-base" />
      <motion.path d={CAMINO} className="pt-secuencia-trazo" style={{ pathLength: trazo }} />
      {/* Estaciones */}
      {NODOS.map((n, i) => (
        <g key={i} transform={`translate(${n.x} ${n.y})`}>
          <circle r="22" className="pt-secuencia-anillo" />
          <motion.circle r="16" className={`${tonos[i]} il-trazo`} style={{ scale: nodos[i], opacity: nodos[i] }} />
          <text y="5" textAnchor="middle" className="pt-secuencia-num">{i + 1}</text>
        </g>
      ))}
      {/* Engrane que gira con el scroll */}
      <g transform="translate(120 110)">
        <motion.g style={{ rotate: giro }}>
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="-6" y="-38" width="12" height="13" rx="3" transform={`rotate(${i * 45})`} className="il-f-ciruela il-trazo" />
          ))}
          <circle r="28" className="il-f-ciruela il-trazo" />
          <circle r="9" className="il-f-piedra il-trazo" />
        </motion.g>
      </g>
      {/* Matraz que se llena */}
      <g transform="translate(410 290)">
        <g clipPath="url(#pt-matraz-clip)">
          <rect x="-12" y="-4" width="104" height="116" className="il-f-piedra" />
          <motion.rect x="-12" y="12" width="104" height="100" className="il-f-azul-fuerte" style={{ y: nivel }} />
        </g>
        <path d="M26 0 L26 26 L-4 92 Q-9 106 4 108 L76 108 Q89 106 84 92 L54 26 L54 0" className="il-trazo il-sin-relleno" />
        <rect x="20" y="-8" width="40" height="10" rx="4" className="il-f-piedra il-trazo" />
        <circle cx="30" cy="78" r="3.5" className="il-tinta" />
        <circle cx="50" cy="78" r="3.5" className="il-tinta" />
        <path d="M33 88 Q40 94 47 88" className="il-linea" />
        <motion.g style={{ opacity: burbujas }}>
          <circle cx="48" cy="-22" r="5" className="il-f-azul il-trazo" />
          <circle cx="34" cy="-40" r="3.5" className="il-f-azul il-trazo" />
        </motion.g>
      </g>
      {/* Confeti final */}
      <motion.g style={{ opacity: fiesta, scale: fiestaEsc }}>
        <path transform="translate(470 70)" d="M0 -12 L3.5 -4 L12 -3.7 L5.5 2 L7.4 10.5 L0 6 L-7.4 10.5 L-5.5 2 L-12 -3.7 L-3.5 -4 Z" className="il-f-ocre il-trazo" />
        <path transform="translate(380 120) rotate(20)" d="M0 -12 A12 12 0 1 0 0 12 A8 12 0 1 1 0 -12 Z" className="il-f-terracota il-trazo" />
        <path transform="translate(496 180) rotate(-30)" d="M0 0 C8 -14 26 -14 30 0 C26 14 8 14 0 0 Z" className="il-f-ocre il-trazo" />
        <circle cx="430" cy="60" r="6" className="il-f-ciruela il-trazo" />
        <path d="M352 196 h14 M359 189 v14" className="il-linea il-linea-vino" />
      </motion.g>
    </svg>
  );
}

/**
 * Sección "Cómo funciona" con la escena fijada (sticky) mientras el scroll recorre una pista alta. El paso activo se
 * calcula del progreso (solo re-renderiza al cambiar de paso). Con movimiento reducido: escena completa y los tres
 * pasos activos, sin fijar.
 */
export function PasosSecuencia({ pasos }: { pasos: PasoSecuencia[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const vivo = useScrollVivo();
  const { scrollYProgress } = useScroll({ target: pista, offset: ['start 0.6', 'end 0.9'] });
  const suave = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.5 });
  const completo = useMotionValue(1);
  const p = vivo ? suave : completo;
  const [activo, setActivo] = useState(pasos.length);
  useEffect(() => { if (!vivo) setActivo(pasos.length); }, [vivo, pasos.length]);
  useMotionValueEvent(suave, 'change', (v) => {
    if (!vivo) return;
    const n = v < 0.3 ? 1 : v < 0.66 ? 2 : 3;
    setActivo((a) => (a === n ? a : n));
  });
  const barra = useTransform(p, [0, 1], [0, 1]);
  return (
    <div ref={pista} className="pt-pasos-pista" data-vivo={vivo || undefined}>
      <div className="pt-pasos-fijo">
        <div className="pt-secuencia">
          <Escena p={p} />
        </div>
        <ol className="pt-pasos-lista">
          <motion.span className="pt-pasos-progreso" style={{ scaleY: barra }} aria-hidden="true" />
          {pasos.map((paso, i) => (
            <li
              key={paso.titulo}
              className="pt-paso"
              data-tono={paso.tono}
              data-activo={i < activo || undefined}
              aria-current={vivo && i === activo - 1 ? 'step' : undefined}
              style={{ '--k': i } as CSSProperties}
            >
              <div className="pt-paso-cabeza">
                <span className="pt-paso-icono">{paso.icono}</span>
                <span className="pt-paso-num">Paso {i + 1}</span>
              </div>
              <h3 className="pt-paso-titulo">{paso.titulo}</h3>
              <p className="pt-paso-texto">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
