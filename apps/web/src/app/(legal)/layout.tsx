import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { INSTITUTION } from '@/lib/institution';
import { BandaInstitucional, LogoComecyt } from '@/components/branding/Logos';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Convivencia oficial de logos en el encabezado (E50) */}
      <BandaInstitucional />
      <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a SIDECyT
          </Link>
          <LogoComecyt className="h-10 dark:hidden" />
          <LogoComecyt variante="negativo" decorativo className="hidden h-10 dark:block" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none bg-white dark:bg-neutral-800 p-8 md:p-12 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
          {children}
        </article>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
        © 2026 {INSTITUTION.fullName}. Todos los derechos reservados.
      </footer>
    </div>
  );
}
