/**
 * E50 (28/09/2026) — Identidad institucional oficial. ÚNICA fuente de logos, colores y nombres para todo el sistema.
 *
 * Fuente: carpeta "IMAGEN COMECYT&CONVIVENCIAS 26" entregada por el usuario (logos 2026) y el Manual de Identidad
 * Gráfica del Gobierno del Estado de México 2023-2029 (MAT DIGITAL 2026). Reglas del manual: no alterar color,
 * composición ni proporciones de los logos; usar la versión negativa sobre fondos oscuros.
 * Documento: docs/IDENTIDAD.md.
 */

export interface Logo { src: string; ancho: number; alto: number; alt: string }

/** Logo del COMECYT (2026). `color` sobre fondos claros, `negativo` (blanco) sobre oscuros, `positivo` (negro) para impresión. */
export const LOGO_COMECYT = {
  color: { src: '/identidad/comecyt-color.png', ancho: 721, alto: 312, alt: 'COMECYT — Consejo Mexiquense de Ciencia y Tecnología' },
  negativo: { src: '/identidad/comecyt-negativo.png', ancho: 720, alto: 311, alt: 'COMECYT — Consejo Mexiquense de Ciencia y Tecnología' },
  positivo: { src: '/identidad/comecyt-positivo.png', ancho: 720, alto: 312, alt: 'COMECYT — Consejo Mexiquense de Ciencia y Tecnología' },
} satisfies Record<string, Logo>;

/**
 * Convivencia de logos (Gobierno del Estado de México · "Estado de México ¡El poder de servir!" · Educación · COMECYT).
 * `negativoA`: escudo y colibrí en dorado sobre fondo oscuro; `negativoB`: todo en blanco.
 */
export const LOGO_CONVIVENCIA = {
  color: { src: '/identidad/convivencia-color.png', ancho: 5212, alto: 388, alt: 'Gobierno del Estado de México, Estado de México ¡El poder de servir!, Secretaría de Educación, Ciencia, Tecnología e Innovación y COMECYT' },
  negativoA: { src: '/identidad/convivencia-negativo-a.png', ancho: 5209, alto: 389, alt: 'Gobierno del Estado de México, Estado de México ¡El poder de servir!, Secretaría de Educación, Ciencia, Tecnología e Innovación y COMECYT' },
  negativoB: { src: '/identidad/convivencia-negativo-b.png', ancho: 5212, alto: 387, alt: 'Gobierno del Estado de México, Estado de México ¡El poder de servir!, Secretaría de Educación, Ciencia, Tecnología e Innovación y COMECYT' },
  positivo: { src: '/identidad/convivencia-positivo.png', ancho: 5208, alto: 388, alt: 'Gobierno del Estado de México, Estado de México ¡El poder de servir!, Secretaría de Educación, Ciencia, Tecnología e Innovación y COMECYT' },
} satisfies Record<string, Logo>;

/**
 * Colores oficiales (manual, "Colores del logotipo", perfil HEX). El vino es el del texto del logotipo COMECYT
 * (verificado midiendo los píxeles del PNG oficial). Las equivalencias Pantone/CMYK están en el manual (p. 41).
 */
export const COLORES = {
  vino: '#56212F',
  guinda: '#9F2241',
  dorado: '#BC955B',
  arena: '#DDC8A4',
  beige: '#C3B08F',
  cafe: '#977E5B',
  bronce: '#965F36',
  grisCalido: '#D6D1CA',
  negro: '#000000',
} as const;

export const NOMBRES = {
  comecyt: 'Consejo Mexiquense de Ciencia y Tecnología',
  gobierno: 'Gobierno del Estado de México',
  lema: '¡El poder de servir!',
  secretaria: 'Secretaría de Educación, Ciencia, Tecnología e Innovación',
  sidecyt: 'Sistema Digital de Emprendimiento, Ciencia y Talento Mexiquense',
} as const;
