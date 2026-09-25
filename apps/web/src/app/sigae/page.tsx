import type { Metadata } from 'next';
import { INSTITUTION } from '@/lib/institution';
import Landing from './Landing';
import './landing.css';

/**
 * Landing pública de SIGAE — https://sidecyt-comecyt.edomex.gob.mx/sigae
 * `/` redirige aquí a quien no tiene sesión (proxy.ts). Documentación: docs/LANDING_SIGAE.md.
 *
 * Las fuentes (Switzer + Satoshi, auto-hospedadas) se definen en lib/fonts.ts y el layout raíz expone
 * sus variables en <html>, para que landing y paneles compartan exactamente las mismas.
 */
export const metadata: Metadata = {
  title: `SIGAE — Sistema de Gestión de Apoyo Empresarial · ${INSTITUTION.name}`,
  description:
    `SIGAE, el Sistema de Gestión de Apoyo Empresarial del ${INSTITUTION.fullName}, para las convocatorias ` +
    'de Apoyo Empresarial: Desarrollo de ' +
    'Prototipos, Incorporación de Profesionistas, Jóvenes Emprendedores e Innovadores y Vinculación de Empresas.',
  alternates: { canonical: '/sigae' },
  openGraph: {
    title: `SIGAE · ${INSTITUTION.name}`,
    description: 'Tu proyecto, de la idea al convenio.',
    type: 'website',
    locale: 'es_MX',
  },
};

export default function SigaePage() {
  return <Landing />;
}
