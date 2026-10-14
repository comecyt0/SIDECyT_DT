'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LOGO_COMECYT } from '@/lib/identidad';
import { usePanelScope } from '@/hooks/usePanelScope';
import PanelFooter from '@/components/layout/PanelFooter';

/**
 * E72 paso 5 — Layout del panel de evaluación compartido SIGAE / SICEI (/evaluador).
 * No usa RoleTopLayout: aquel exige sesión de SIGAE, y quien solo evalúa en SICEI no la tiene. Mismo sistema visual
 * (panel-root, styles/panel-sigae.css); el contenido (sesiones, switch, asignaciones) lo maneja cada página.
 */
export default function PanelEvaluacionLayout({ children }: { children: React.ReactNode }) {
  usePanelScope();

  return (
    <div className="panel-root min-h-screen flex flex-col">
      <div className="panel-splash" aria-hidden="true"><span /><span /><span /></div>
      <header className="panel-topbar sticky z-50">
        <div className="panel-topbar-row h-16 flex items-center gap-3">
          <Link href="/evaluador" className="panel-brand flex items-center gap-3 shrink-0" title="Panel de evaluación SIDECyT">
            <Image src={LOGO_COMECYT.color.src} alt={LOGO_COMECYT.color.alt} width={LOGO_COMECYT.color.ancho} height={LOGO_COMECYT.color.alto} priority className="logo-tema-claro h-10 w-auto object-contain" />
            <Image src={LOGO_COMECYT.negativo.src} alt={LOGO_COMECYT.negativo.alt} width={LOGO_COMECYT.negativo.ancho} height={LOGO_COMECYT.negativo.alto} priority className="logo-tema-oscuro h-10 w-auto object-contain" />
            <div className="hidden sm:block">
              <span className="panel-brand-name">Evaluación<span className="panel-swatch" aria-hidden="true" /></span>
              <span className="panel-brand-sub">SIDECyT · SIGAE y SICEI</span>
            </div>
          </Link>
          <div className="flex-1" />
          <Link href="/" className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:text-primary px-3 py-2 rounded-xl">
            Portal SIDECyT
          </Link>
        </div>
      </header>
      <main className="panel-main flex-1 mx-auto w-full max-w-6xl px-4 md:px-8 py-6" data-section-tone="butter">
        {children}
      </main>
      <PanelFooter />
    </div>
  );
}
