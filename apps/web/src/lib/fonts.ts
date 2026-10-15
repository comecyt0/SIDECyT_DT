import localFont from 'next/font/local';

/**
 * Fuentes del sistema visual SIGAE (landing /sigae y paneles), auto-hospedadas: la CSP solo permite
 * `font-src 'self'` y el servidor no alcanza Google Fonts. Ambas de Fontshare, licencia FFL (uso
 * comercial y web permitido) — ver src/fonts/LICENSE-FFL.txt.
 *
 * - Switzer: texto e interfaz.
 * - Satoshi: titulares (sustituto libre de Basier Circle, la de la referencia portrait.so).
 *
 * Solo definen variables CSS: el login sigue con Geist (`--font-sans`) y no cambia.
 */
export const switzer = localFont({
  src: '../fonts/Switzer-Variable.woff2',
  variable: '--font-lp-text',
  weight: '100 900',
  display: 'swap',
});

/**
 * Titulares institucionales (E50, 28/09/2026). El manual de identidad COMECYT 2026 pide Gotham, que es
 * comercial y no está en el servidor: se usa Montserrat (SIL OFL 1.1, src/fonts/LICENSE-OFL-Montserrat.txt),
 * su equivalente geométrico libre más cercano. Solo para títulos y textos importantes (regla del usuario);
 * el texto corrido sigue en Switzer. Si COMECYT entrega los archivos oficiales de Gotham, basta con
 * agregarlos aquí: la pila `--font-titulos` ya pone "Gotham" primero (globals.css).
 */
export const montserrat = localFont({
  src: '../fonts/Montserrat-Variable.woff2',
  variable: '--font-montserrat',
  weight: '100 900',
  display: 'swap',
});

/**
 * Texto corrido del portal SIDECyT (15/10/2026, rediseño con la referencia "Family"). Inter 4.1, SIL OFL 1.1
 * (src/fonts/LICENSE-OFL-Inter.txt), descargada del release oficial rsms/inter. Solo la importa el portal
 * (`app/page.tsx`), así que no se precarga en el resto del sistema.
 */
export const inter = localFont({
  src: '../fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});

export const satoshi = localFont({
  src: '../fonts/Satoshi-Variable.woff2',
  variable: '--font-lp-display',
  weight: '300 900',
  display: 'swap',
});
