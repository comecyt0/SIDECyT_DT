'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * 21/09/2026 — Tile de indicador VIVO Y MULTICOLOR (referencia Duolingo, wine principal).
 * El color lo pone `data-tone`; los estilos viven en globals.css (.stat-tile / .tone-chip /
 * .tone-card). Paleta ampliada respecto a la versión sobria. Reutilizable por los 4 roles.
 */
export type TileTone =
  | 'vino' | 'gold' | 'amber' | 'orange' | 'emerald'
  | 'teal' | 'sky' | 'blue' | 'violet' | 'rose' | 'red' | 'neutral';

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: TileTone;
  /** Frase corta debajo del nombre ("Esperan tu revisión"). */
  hint?: string;
  /** Si se da, la tarjeta completa es un enlace. */
  href?: string;
  /** Tarjeta protagonista del bento (tono sólido vivo, texto blanco). */
  solid?: boolean;
  loading?: boolean;
}

/** Tarjeta de indicador del bento (misma que el dashboard de admin), para los 4 roles. */
export default function StatTile({ label, value, icon, tone = 'vino', hint, href, solid = false, loading = false }: StatTileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span className="tone-chip h-11 w-11">{icon}</span>
        {href && (
          <span className="app-nav-icon !w-8 !h-8 !rounded-lg transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`stat-value mt-5 text-4xl font-extrabold tracking-tight ${solid ? 'text-white' : ''}`}>
        {loading ? <span className="skeleton inline-block h-9 w-14 rounded-md align-middle" /> : value}
      </p>
      <p className={`text-sm font-bold mt-1 ${solid ? 'text-white' : 'text-[var(--app-ink)]'}`}>{label}</p>
      {hint && <p className={`text-xs mt-0.5 ${solid ? 'text-white/75' : 'text-[var(--app-ink-2)]'}`}>{hint}</p>}
    </>
  );
  const cls = `stat-tile tone-card block p-5 group outline-none focus-visible:ring-4 focus-visible:ring-[oklch(var(--tone-fg-L)_var(--tc)_var(--th)/0.4)] h-full`;
  if (href) {
    return (
      <Link href={href} className={cls} data-tone={tone} data-solid={solid || undefined} data-interactive="true">
        {body}
      </Link>
    );
  }
  return (
    <div className={cls} data-tone={tone} data-solid={solid || undefined}>
      {body}
    </div>
  );
}
