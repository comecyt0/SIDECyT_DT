import type { CSSProperties } from 'react';

/**
 * Ilustraciones del portal SIDECyT (15/10/2026, referencia "Family"): personajes de ciencia dibujados a mano en SVG
 * (matraz, foco, engrane, átomo) y confeti geométrico (estrellas, hojas, medias lunas, signos +, círculos).
 * Trazo fino en `--pt-trazo` y rellenos en tintes de la paleta derivada del vino (clases `.il-*` en portal.css), sin
 * colores escritos aquí. Son decorativas: `aria-hidden`, sin texto, sin datos. El movimiento (flotar, parpadear,
 * burbujas, giro) es CSS y se apaga con `prefers-reduced-motion`.
 */

type Tono = 'azul' | 'ocre' | 'ciruela' | 'terracota' | 'vino';

const ESTRELLA = 'M0 -12 L3.5 -4 L12 -3.7 L5.5 2 L7.4 10.5 L0 6 L-7.4 10.5 L-5.5 2 L-12 -3.7 L-3.5 -4 Z';
const HOJA = 'M0 0 C8 -14 26 -14 30 0 C26 14 8 14 0 0 Z';
const MEDIA_LUNA = 'M0 -12 A12 12 0 1 0 0 12 A8 12 0 1 1 0 -12 Z';

/** Pieza de confeti. `d` = retraso de su deriva (s) para que no se muevan al unísono. */
function Confeti({ forma, tono, x, y, giro = 0, escala = 1, d = 0 }: {
  forma: 'estrella' | 'hoja' | 'luna' | 'mas' | 'punto' | 'aro'; tono: Tono; x: number; y: number; giro?: number; escala?: number; d?: number;
}) {
  const estilo = { '--d': `${d}s` } as CSSProperties;
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
      <g className="il-confeti" style={estilo}>
        {forma === 'estrella' && <path d={ESTRELLA} className={`il-f-${tono} il-trazo`} />}
        {forma === 'hoja' && (<><path d={HOJA} className={`il-f-${tono} il-trazo`} /><path d="M3 0 L25 0" className="il-linea" /></>)}
        {forma === 'luna' && <path d={MEDIA_LUNA} className={`il-f-${tono} il-trazo`} />}
        {forma === 'mas' && <path d="M-8 0 H8 M0 -8 V8" className={`il-linea il-linea-${tono}`} />}
        {forma === 'punto' && <circle r="6" className={`il-f-${tono} il-trazo`} />}
        {forma === 'aro' && <circle r="7" className={`il-aro il-aro-${tono}`} />}
      </g>
    </g>
  );
}

/** Ojos con parpadeo (escala vertical breve cada pocos segundos). */
function Ojos({ x1, x2, y, r = 4, d = 0 }: { x1: number; x2: number; y: number; r?: number; d?: number }) {
  return (
    <g className="il-ojos" style={{ '--d': `${d}s` } as CSSProperties}>
      <circle cx={x1} cy={y} r={r} className="il-tinta" />
      <circle cx={x2} cy={y} r={r} className="il-tinta" />
    </g>
  );
}

/** Matraz con líquido, burbujas, brazos y piernas de palito. Caja aprox. 0..124 × -64..200. */
export function Matraz() {
  return (
    <g className="il-personaje">
      <g className="il-burbujas">
        <circle cx="66" cy="-18" r="6" className="il-f-azul il-trazo il-burbuja" style={{ '--d': '0s' } as CSSProperties} />
        <circle cx="52" cy="-38" r="4" className="il-f-azul il-trazo il-burbuja" style={{ '--d': '0.9s' } as CSSProperties} />
        <circle cx="70" cy="-56" r="3" className="il-f-azul il-trazo il-burbuja" style={{ '--d': '1.7s' } as CSSProperties} />
      </g>
      <path d="M22 128 L2 108" className="il-linea il-brazo-izq" />
      <circle cx="2" cy="108" r="3.5" className="il-tinta" />
      <path d="M98 128 Q112 112 120 100" className="il-linea il-brazo-saluda" />
      <circle cx="120" cy="100" r="3.5" className="il-tinta" />
      <path d="M42 168 L36 196 L28 196 M78 168 L84 196 L92 196" className="il-linea" />
      <path d="M46 40 L46 70 L10 150 Q4 166 20 168 L100 168 Q116 166 110 150 L74 70 L74 40 Z" className="il-f-azul il-trazo" />
      <path d="M27 115 Q60 104 93 115 L110 150 Q116 166 100 168 L20 168 Q4 166 10 150 Z" className="il-f-azul-fuerte" />
      <path d="M46 40 L46 70 L10 150 Q4 166 20 168 L100 168 Q116 166 110 150 L74 70 L74 40" className="il-trazo il-sin-relleno" />
      <rect x="40" y="32" width="40" height="10" rx="4" className="il-f-piedra il-trazo" />
      <Ojos x1={48} x2={72} y={136} d={0.4} />
      <path d="M52 148 Q60 155 68 148" className="il-linea" />
    </g>
  );
}

/** Foco con rayos que laten, mejillas y base roscada. Caja aprox. -14..134 × -18..190. */
export function Foco() {
  return (
    <g className="il-personaje">
      <g className="il-rayos">
        <path d="M60 -4 V-18 M14 22 L4 12 M106 22 L116 12 M0 66 H-14 M120 66 H134" className="il-linea il-linea-ocre" />
      </g>
      <path d="M24 104 L2 130" className="il-linea" />
      <circle cx="2" cy="130" r="3.5" className="il-tinta" />
      <path d="M96 104 L116 84" className="il-linea" />
      <circle cx="116" cy="84" r="3.5" className="il-tinta" />
      <path d="M50 159 L46 186 L38 186 M70 159 L76 186 L84 186" className="il-linea" />
      <path d="M22 100 Q8 70 18 42 Q34 10 60 10 Q86 10 102 42 Q112 70 98 100 Q88 114 86 128 L34 128 Q32 114 22 100 Z" className="il-f-ocre il-trazo" />
      <rect x="36" y="128" width="48" height="10" rx="3" className="il-f-piedra il-trazo" />
      <rect x="38" y="140" width="44" height="9" rx="3" className="il-f-piedra il-trazo" />
      <rect x="46" y="151" width="28" height="8" rx="4" className="il-f-vino il-trazo" />
      <circle cx="36" cy="84" r="6" className="il-mejilla" />
      <circle cx="84" cy="84" r="6" className="il-mejilla" />
      <Ojos x1={46} x2={74} y={70} r={4.5} d={1.6} />
      <path d="M50 86 Q60 95 70 86" className="il-linea" />
    </g>
  );
}

/** Engrane: los dientes giran detrás del cuerpo; la cara se queda quieta. Centrado en 0,0, radio ≈ 46. */
export function Engrane() {
  return (
    <g className="il-personaje">
      <g className="il-dientes">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="-7" y="-46" width="14" height="16" rx="3" transform={`rotate(${i * 45})`} className="il-f-ciruela il-trazo" />
        ))}
      </g>
      <circle r="34" className="il-f-ciruela il-trazo" />
      <Ojos x1={-11} x2={11} y={-4} d={2.6} />
      <path d="M-8 10 Q0 17 8 10" className="il-linea" />
    </g>
  );
}

/** Átomo: núcleo y tres órbitas que giran lento. Centrado en 0,0. */
export function Atomo() {
  return (
    <g className="il-atomo">
      {[0, 60, 120].map((g) => <ellipse key={g} rx="40" ry="14" transform={`rotate(${g})`} className="il-trazo il-sin-relleno" />)}
      <circle r="9" className="il-f-terracota il-trazo" />
      <circle cx="40" cy="0" r="4" className="il-tinta" />
    </g>
  );
}

/** Grupo izquierdo del héroe: matraz + átomo + confeti. */
export function GrupoIzquierdo() {
  return (
    <svg className="il-svg" viewBox="0 0 280 440" aria-hidden="true" focusable="false">
      <g className="il-flota" style={{ '--d': '0s', '--dur': '6.5s' } as CSSProperties}>
        <g transform="translate(70 170)"><Matraz /></g>
      </g>
      <g className="il-flota" style={{ '--d': '1.2s', '--dur': '8s' } as CSSProperties}>
        <g transform="translate(200 70)"><Atomo /></g>
      </g>
      <Confeti forma="estrella" tono="ocre" x={40} y={60} giro={-12} d={0.3} />
      <Confeti forma="luna" tono="terracota" x={250} y={210} giro={20} d={1.1} />
      <Confeti forma="hoja" tono="ocre" x={18} y={330} giro={-30} d={0.7} />
      <Confeti forma="mas" tono="vino" x={236} y={330} d={1.9} />
      <Confeti forma="punto" tono="ciruela" x={120} y={30} escala={0.8} d={2.4} />
      <Confeti forma="aro" tono="azul" x={30} y={190} d={1.5} />
      <Confeti forma="estrella" tono="azul" x={244} y={410} escala={0.7} giro={18} d={2.8} />
    </svg>
  );
}

/** Grupo derecho del héroe: foco + engrane + confeti. */
export function GrupoDerecho() {
  return (
    <svg className="il-svg" viewBox="0 0 280 440" aria-hidden="true" focusable="false">
      <g className="il-flota" style={{ '--d': '0.6s', '--dur': '7s' } as CSSProperties}>
        <g transform="translate(110 60)"><Foco /></g>
      </g>
      <g className="il-flota" style={{ '--d': '1.8s', '--dur': '9s' } as CSSProperties}>
        <g transform="translate(70 340)"><Engrane /></g>
      </g>
      <Confeti forma="luna" tono="vino" x={40} y={50} giro={-24} d={0.5} />
      <Confeti forma="estrella" tono="ocre" x={250} y={290} giro={10} d={1.3} />
      <Confeti forma="hoja" tono="ocre" x={190} y={380} giro={160} d={2.1} />
      <Confeti forma="mas" tono="azul" x={30} y={230} d={0.9} />
      <Confeti forma="punto" tono="terracota" x={262} y={40} escala={0.8} d={2.6} />
      <Confeti forma="aro" tono="ciruela" x={170} y={270} d={1.7} />
    </svg>
  );
}

/** Versión compacta para teléfono y tableta: los tres personajes en fila, sobre el título. */
export function GrupoCompacto() {
  return (
    <svg className="il-svg" viewBox="0 0 360 150" aria-hidden="true" focusable="false">
      <g className="il-flota" style={{ '--d': '0s', '--dur': '6.5s' } as CSSProperties}>
        <g transform="translate(36 52) scale(0.42)"><Matraz /></g>
      </g>
      <g className="il-flota" style={{ '--d': '0.8s', '--dur': '7.5s' } as CSSProperties}>
        <g transform="translate(150 28) scale(0.48)"><Foco /></g>
      </g>
      <g className="il-flota" style={{ '--d': '1.6s', '--dur': '9s' } as CSSProperties}>
        <g transform="translate(296 84) scale(0.62)"><Engrane /></g>
      </g>
      <Confeti forma="estrella" tono="ocre" x={110} y={30} escala={0.7} d={0.4} />
      <Confeti forma="luna" tono="terracota" x={250} y={24} escala={0.7} giro={20} d={1.2} />
      <Confeti forma="mas" tono="vino" x={12} y={40} escala={0.8} d={2} />
      <Confeti forma="hoja" tono="ocre" x={330} y={20} escala={0.6} giro={-20} d={0.9} />
    </svg>
  );
}
