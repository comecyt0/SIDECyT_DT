import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FlaskConical } from 'lucide-react';
import { INSTITUTION } from '@/lib/institution';
import { PiePortal } from '@/components/portal/Portal';
import '@/components/portal/portal.css';

/**
 * SICEI — Sistema de Impulso a la Ciencia, Educación e Innovación (/sicei), 25/09/2026.
 * Aún no existe: página pública de "próximamente" con el mismo lenguaje visual del portal. Cuando el usuario defina el
 * sistema, esta ruta se sustituye por su landing.
 */
export const metadata: Metadata = {
  title: `SICEI — Sistema de Impulso a la Ciencia, Educación e Innovación · ${INSTITUTION.name}`,
  description: `SICEI, el nuevo sistema del ${INSTITUTION.fullName} para la ciencia, la educación y la innovación. Próximamente.`,
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
      <header className="pt-barra">
        <div className="pt-wrap pt-barra-fila">
          <Link href="/" className="pt-marca" aria-label={`${INSTITUTION.name} — portal de sistemas`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo institucional */}
            <img src="/logo-recortado.png" alt={INSTITUTION.name} width={124} height={55} />
            <span className="pt-marca-texto">Portal de sistemas</span>
          </Link>
          <Link href="/" className="pt-barra-enlace"><ArrowLeft aria-hidden="true" /> Volver al portal</Link>
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
            Estamos preparando el sistema donde la comunidad científica, académica y estudiantil, y quienes impulsan la
            innovación, podrán postular a los programas del {INSTITUTION.name} y dar seguimiento a sus solicitudes. Muy pronto
            estará disponible aquí.
          </p>
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
