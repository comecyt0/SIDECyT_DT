import type { Metadata } from 'next';
import { INSTITUTION } from '@/lib/institution';
import Landing from './Landing';
import './landing.css';

/**
 * Landing pública de SIGAC — https://sidecyt-comecyt.edomex.gob.mx/sigac
 * `/` redirige aquí a quien no tiene sesión (proxy.ts). Documentación: docs/LANDING_SIGAC.md.
 *
 * Las fuentes (Switzer + Satoshi, auto-hospedadas) se definen en lib/fonts.ts y el layout raíz expone
 * sus variables en <html>, para que landing y paneles compartan exactamente las mismas.
 */
export const metadata: Metadata = {
  title: `SIGAC — Sistema de Gestión de Apoyos Científicos · ${INSTITUTION.name}`,
  description:
    `SIGAC, el Sistema de Gestión de Apoyos Científicos del ${INSTITUTION.fullName}, para las convocatorias ` +
    'de Apoyo Empresarial: Desarrollo de ' +
    'Prototipos, Incorporación de Profesionistas, Jóvenes Emprendedores e Innovadores y Vinculación de Empresas.',
  alternates: { canonical: '/sigac' },
  openGraph: {
    title: `SIGAC · ${INSTITUTION.name}`,
    description: 'Tu proyecto, de la idea al convenio.',
    type: 'website',
    locale: 'es_MX',
  },
};

export default function SigacPage() {
  return <Landing />;
}
