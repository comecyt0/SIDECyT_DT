import localFont from 'next/font/local';

/**
 * Fuentes del sistema visual SIGAC (landing /sigac y paneles), auto-hospedadas: la CSP solo permite
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

export const satoshi = localFont({
  src: '../fonts/Satoshi-Variable.woff2',
  variable: '--font-lp-display',
  weight: '300 900',
  display: 'swap',
});
