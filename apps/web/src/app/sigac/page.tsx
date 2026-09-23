import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { INSTITUTION } from '@/lib/institution';
import Landing from './Landing';
import './landing.css';

/**
 * Landing pública de SIDECyT — https://sidecyt-comecyt.edomex.gob.mx/sigac
 * `/` redirige aquí a quien no tiene sesión (proxy.ts). Documentación: docs/LANDING_SIGAC.md.
 *
 * Fuentes auto-hospedadas (la CSP solo permite `font-src 'self'`): Switzer para texto y Satoshi
 * como sustituto libre de Basier Circle para titulares. Ambas de Fontshare, licencia FFL
 * (uso comercial y web permitido) — ver ./fonts/LICENSE-FFL.txt.
 */
const switzer = localFont({
  src: './fonts/Switzer-Variable.woff2',
  variable: '--font-lp-text',
  weight: '100 900',
  display: 'swap',
});

const satoshi = localFont({
  src: './fonts/Satoshi-Variable.woff2',
  variable: '--font-lp-display',
  weight: '300 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `SIDECyT · ${INSTITUTION.name} — Proyectos de desarrollo tecnológico y vinculación`,
  description:
    `Plataforma del ${INSTITUTION.fullName} para postular proyectos de desarrollo tecnológico y vinculación, ` +
    'seguir cada etapa y recibir el apoyo.',
  alternates: { canonical: '/sigac' },
  openGraph: {
    title: `SIDECyT · ${INSTITUTION.name}`,
    description: 'Tu proyecto, de la idea al convenio.',
    type: 'website',
    locale: 'es_MX',
  },
};

export default function SigacPage() {
  return (
    <div className={`${switzer.variable} ${satoshi.variable}`}>
      <Landing />
    </div>
  );
}
