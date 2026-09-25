import type { Metadata } from 'next';
import { INSTITUTION } from '@/lib/institution';
import Portal from '@/components/portal/Portal';
import '@/components/portal/portal.css';

/**
 * Portal de sistemas del COMECYT — https://sidecyt-comecyt.edomex.gob.mx/ (25/09/2026).
 * Accesos a SIGAE (/sigae) y SICEI (/sicei). Pública para todos (proxy.ts ya no redirige la raíz).
 */
export const metadata: Metadata = {
  title: `Sistemas del ${INSTITUTION.name} — SIGAE y SICEI`,
  description:
    `Portal de sistemas del ${INSTITUTION.fullName}: SIGAE, Sistema de Gestión de Apoyo Empresarial, y SICEI, ` +
    'Sistema de Impulso a la Ciencia, Educación e Innovación.',
  alternates: { canonical: '/' },
  openGraph: { title: `Sistemas del ${INSTITUTION.name}`, description: 'SIGAE y SICEI en un solo lugar.', type: 'website', locale: 'es_MX' },
};

export default function RootPage() {
  return <Portal />;
}
