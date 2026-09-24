'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/**
 * Tarjeta de indicador — v3 (24/09/2026, sistema SIGAC: landing + referencia Aboard).
 * Tarjeta blanca de producto (radio 20, sombra suave única) con chip pastel del tono, cifra grande en
 * Satoshi y una flecha que avanza al pasar el cursor. Pensada para ir sola o dentro de un <PastelFrame>.
 * `solid` = protagonista en tinta navy. El tono solo pinta el chip y un filo inferior: sin saturar.
 * Estilos: `.stat-tile` en styles/panel-sigac.css. Misma API que la v2: los 4 roles la heredan.
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
  /** Tarjeta protagonista (tinta navy, texto blanco). */
  solid?: boolean;
  loading?: boolean;
}

export default function StatTile({ label, value, icon, tone = 'vino', hint, href, solid = false, loading = false }: StatTileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="stat-chip" aria-hidden="true">{icon}</span>
        {href && (
          <span className="stat-go" aria-hidden="true">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="stat-value">
        {loading ? <span className="skeleton inline-block h-10 w-16 rounded-lg align-middle" /> : value}
      </p>
      <p className="stat-label">{label}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </>
  );
  const cls = 'stat-tile group block h-full outline-none';
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
