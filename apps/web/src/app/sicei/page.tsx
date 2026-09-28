import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, FlaskConical, GraduationCap } from 'lucide-react';
import { INSTITUTION } from '@/lib/institution';
import { PiePortal } from '@/components/portal/Portal';
import { LogoComecyt, BandaInstitucional } from '@/components/branding/Logos';
import ProgramasSistema from '@/components/portal/ProgramasSistema';

const COMECYT = 'https://comecyt.edomex.gob.mx';
import '@/components/portal/portal.css';

/**
 * SICEI — Sistema de Impulso a la Ciencia, Educación e Innovación (/sicei), 25/09/2026.
 * Aún no existe: página pública de "próximamente" con el mismo lenguaje visual del portal. Cuando el usuario defina el
 * sistema, esta ruta se sustituye por su landing.
 */
export const metadata: Metadata = {
  title: `SICEI — Sistema de Impulso a la Ciencia, Educación e Innovación · ${INSTITUTION.name}`,
  description: `SICEI, el sistema de SIDECyT del ${INSTITUTION.fullName} para las becas a estudiantes y el impulso a la investigación. Próximamente.`,
  alternates: { canonical: '/sicei' },
};

export default function SiceiPage() {
  return (
    <div className="pt-root" data-listo="true">
      <div className="pt-fondo" aria-hidden="true">
        <span className="pt-fondo-reticula" />
        <span className="pt-fondo-halo pt-fondo-halo-a" />
        <span className="pt-fondo-halo pt-fondo-halo-b" />
      </div>
      <BandaInstitucional />
      <header className="pt-barra">
        <div className="pt-wrap pt-barra-fila">
          <Link href="/" className="pt-marca" aria-label={`${INSTITUTION.name} — portal de sistemas`}>
            <LogoComecyt />
            <span className="pt-marca-texto"><strong>SIDECyT</strong><span className="pt-marca-sub">Portal de sistemas</span></span>
          </Link>
          <Link href="/" className="pt-barra-enlace" aria-label="Volver al portal"><ArrowLeft aria-hidden="true" /> <span className="pt-barra-enlace-texto">Volver al portal</span></Link>
        </div>
      </header>
      <main className="pt-wrap pt-sicei">
        <section className="pt-sicei-caja pt-entra" aria-labelledby="sicei-titulo">
          <div className="pt-sistema-cabeza">
            <span className="pt-sistema-icono" style={{ color: 'var(--pt-menta-tinta)' }}><FlaskConical aria-hidden="true" /></span>
            <span className="pt-estado" data-estado="proximamente"><span aria-hidden="true" />Próximamente</span>
          </div>
          <h1 id="sicei-titulo" className="pt-sigla">SICEI</h1>
          <p className="pt-nombre">Sistema de Impulso a la Ciencia, Educación e Innovación</p>
          <p className="pt-heroe-texto">
            SICEI será el sistema de SIDECyT para las <strong>becas a estudiantes</strong> mexiquenses y el <strong>impulso
            a la investigación</strong> científica y tecnológica del {INSTITUTION.name}: ahí podrás postular y dar seguimiento
            a tu solicitud. Estamos preparándolo; muy pronto estará disponible aquí.
          </p>
          <div className="pt-sicei-areas">
            <a href={`${COMECYT}/becas-estudiantes`} target="_blank" rel="noopener noreferrer" className="pt-acceso">
              <span className="pt-acceso-icono"><GraduationCap aria-hidden="true" /></span>
              <span className="pt-acceso-texto">
                <span className="pt-acceso-etiqueta">Becas a estudiantes</span>
                <span className="pt-acceso-detalle">Mientras tanto, consulta las becas vigentes en el sitio del COMECYT</span>
              </span>
              <ArrowUpRight className="pt-acceso-flecha" aria-hidden="true" />
            </a>
            <a href={`${COMECYT}/impulso-investigacion`} target="_blank" rel="noopener noreferrer" className="pt-acceso">
              <span className="pt-acceso-icono"><FlaskConical aria-hidden="true" /></span>
              <span className="pt-acceso-texto">
                <span className="pt-acceso-etiqueta">Impulso a la investigación</span>
                <span className="pt-acceso-detalle">Estímulos, fondos y premios, en el sitio del COMECYT</span>
              </span>
              <ArrowUpRight className="pt-acceso-flecha" aria-hidden="true" />
            </a>
          </div>
          {/* Programas de SICEI: solo aparecen cuando el admin los activa en /admin/sitio (hoy, ninguno). */}
          <ProgramasSistema sistema="sicei" />
          <div className="pt-sicei-acciones">
            <Link href="/" className="pt-cta" data-variante="principal">
              <ArrowLeft className="pt-cta-flecha" aria-hidden="true" /><span className="pt-cta-texto">Volver al portal</span>
            </Link>
            <Link href="/sigae" className="pt-cta" data-variante="secundario">
              <span className="pt-cta-texto">¿Tienes una empresa? Ve a SIGAE</span><ArrowRight className="pt-cta-flecha" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <PiePortal />
    </div>
  );
}
