'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export type TileTone = 'vino' | 'gold' | 'sky' | 'emerald';

export const TILE_TONE_VARS: Record<TileTone, { bg: string; fg: string }> = {
  vino: { bg: 'var(--tile-vino-bg)', fg: 'var(--tile-vino-fg)' },
  gold: { bg: 'var(--tile-gold-bg)', fg: 'var(--tile-gold-fg)' },
  sky: { bg: 'var(--tile-sky-bg)', fg: 'var(--tile-sky-fg)' },
  emerald: { bg: 'var(--tile-emerald-bg)', fg: 'var(--tile-emerald-fg)' },
};

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: TileTone;
  /** Frase corta debajo del nombre ("Esperan tu revisión"). */
  hint?: string;
  /** Si se da, la tarjeta completa es un enlace. */
  href?: string;
  /** Tarjeta protagonista del bento (ciruela, texto blanco). */
  solid?: boolean;
  loading?: boolean;
}

/** Tarjeta de indicador del bento (misma que el dashboard de admin), para los 4 roles. */
export default function StatTile({ label, value, icon, tone = 'vino', hint, href, solid = false, loading = false }: StatTileProps) {
  const t = TILE_TONE_VARS[tone];
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span className="app-tile-icon" style={solid ? undefined : { color: t.fg }}>{icon}</span>
        {href && (
          <span className="app-nav-icon !w-8 !h-8 !rounded-lg transition-transform duration-200 group-hover:translate-x-0.5" style={solid ? undefined : { color: t.fg }}>
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-5 text-4xl font-extrabold tracking-tight ${solid ? 'text-white' : 'text-[var(--app-ink)]'}`}>
        {loading ? <span className="skeleton inline-block h-9 w-14 rounded-md align-middle" /> : value}
      </p>
      <p className={`text-sm font-semibold mt-1 ${solid ? 'text-white' : 'text-[var(--app-ink)]'}`}>{label}</p>
      {hint && <p className={`text-xs ${solid ? 'text-white/75' : 'text-[var(--app-ink-2)]'}`}>{hint}</p>}
    </>
  );
  const cls = 'app-card block p-5 group outline-none focus-visible:ring-4 h-full';
  const style = solid ? undefined : { backgroundColor: t.bg };
  if (href) {
    return (
      <Link href={href} className={cls} data-interactive="true" data-tone={solid ? 'solid' : undefined} style={style}>
        {body}
      </Link>
    );
  }
  return (
    <div className={cls} data-tone={solid ? 'solid' : undefined} style={style}>
      {body}
    </div>
  );
}
