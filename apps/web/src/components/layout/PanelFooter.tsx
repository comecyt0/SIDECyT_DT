import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Mail } from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';

// Mismo correo que el pie de la landing (/sigae): buzón de proyectos de Apoyo Empresarial.
const CONTACTO = 'proyectos.comecyt@edomex.gob.mx';

const ENLACES = [
  { href: '/sigae', label: 'Sitio público' },
  { href: '/privacidad', label: 'Aviso de privacidad' },
  { href: '/terminos', label: 'Términos de uso' },
] as const;

/**
 * Pie común de los 4 paneles (E43, 24/09/2026). Tarjeta blanca con el logo de COMECYT 5 veces más grande
 * que el pie anterior (28 px de `logo.png`, con ~46 % de margen transparente → 76 px de `logo-recortado.png`
 * visible), nombre del sistema, enlaces públicos y contacto. Estilos en `styles/panel-sigae.css` (.pfoot-*).
 */
export default function PanelFooter() {
  return (
    <footer className="panel-footer pfoot mx-auto w-full px-4 md:px-8">
      <div className="pfoot-card">
        <div className="pfoot-brand">
          <Image src="/logo-recortado.png" alt="COMECYT" width={398} height={176} className="pfoot-logo" />
          <div className="min-w-0">
            <p className="pfoot-name">SIGAE</p>
            <p className="pfoot-sub">Sistema de Gestión de Apoyo Empresarial</p>
            <p className="pfoot-inst">{INSTITUTION.fullName}</p>
          </div>
        </div>

        <nav aria-label="Enlaces del pie" className="pfoot-links">
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href} className="pfoot-link">
              {e.label}
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
