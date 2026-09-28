'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Mail } from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { LOGO_COMECYT } from '@/lib/identidad';
import { useT } from '@/i18n/I18nProvider';

// Mismo correo que el pie de la landing (/sigae): buzón de proyectos de Apoyo Empresarial.
const CONTACTO = 'proyectos.comecyt@edomex.gob.mx';

const ENLACES = [
  { href: '/', label: 'footer.sidecyt' },
  { href: '/sigae', label: 'footer.public_site' },
  { href: '/privacidad', label: 'footer.privacy' },
  { href: '/terminos', label: 'footer.terms' },
] as const;

/**
 * Pie común de los 4 paneles (E43, 24/09/2026). Tarjeta blanca con el logo oficial COMECYT 2026 (E50), nombre del
 * sistema, enlaces públicos y contacto. Sin franja institucional: por regla del usuario va solo en el encabezado de las
 * páginas públicas y de acceso, no en los paneles. Textos del diccionario (menú y encabezados traducibles, E50). Estilos: `.pfoot-*`.
 */
export default function PanelFooter() {
  const { t } = useT();
  return (
    <footer className="panel-footer pfoot mx-auto w-full px-4 md:px-8">
      <div className="pfoot-card">
        <div className="pfoot-brand">
          <Image src={LOGO_COMECYT.color.src} alt={LOGO_COMECYT.color.alt} width={LOGO_COMECYT.color.ancho} height={LOGO_COMECYT.color.alto} className="pfoot-logo" />
          <div className="min-w-0">
            <p className="pfoot-name">SIGAE</p>
            <p className="pfoot-sub">{t('footer.system_name')}</p>
            <p className="pfoot-inst">{INSTITUTION.fullName}</p>
          </div>
        </div>

        <nav aria-label={t('footer.links_label')} className="pfoot-links">
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href} className="pfoot-link">
              {t(e.label)}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ))}
          <a href={`mailto:${CONTACTO}`} className="pfoot-link pfoot-mail">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            {CONTACTO}
          </a>
        </nav>
      </div>

      <div className="pfoot-legal">
        <p>{copyrightLine()}</p>
        <p>{INSTITUTION.systemTagline}</p>
      </div>
    </footer>
  );
}
