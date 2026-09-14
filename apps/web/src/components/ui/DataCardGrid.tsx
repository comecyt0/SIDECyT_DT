'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Grid de tarjetas modernas reusable para reemplazar tablas densas.
 *
 * Cada tarjeta:
 * - Animación de entrada en cascada (stagger 50ms).
 * - Hover lift -3px con sombra expandida.
 * - Border accent opcional según estado (--brand-vino, emerald, amber, red).
 * - Acento lateral coloreado opcional (4px).
 *
 * Uso:
 * <DataCardGrid
 *   items={empresas}
 *   getKey={(e) => e.id}
 *   renderCard={(e) => <EmpresaCardContent empresa={e} />}
 *   accentColor={(e) => e.activa ? 'emerald' : 'neutral'}
 *   columns={3}
 * />
 */

type AccentColor = 'primary' | 'emerald' | 'amber' | 'red' | 'sky' | 'neutral' | 'purple' | 'teal';

const ACCENT_CLASSES: Record<AccentColor, string> = {
  primary: 'before:bg-primary',
  emerald: 'before:bg-emerald-500',
  amber:   'before:bg-amber-500',
  red:     'before:bg-red-500',
  sky:     'before:bg-sky-500',
  neutral: 'before:bg-neutral-300 dark:before:bg-neutral-600',
  purple:  'before:bg-purple-500',
  teal:    'before:bg-teal-500',
};

const HOVER_GLOW: Record<AccentColor, string> = {
  primary: 'hover:shadow-[0_8px_24px_-8px_var(--brand-vino)]',
  emerald: 'hover:shadow-[0_8px_24px_-8px_rgba(16,185,129,0.4)]',
  amber:   'hover:shadow-[0_8px_24px_-8px_rgba(245,158,11,0.4)]',
  red:     'hover:shadow-[0_8px_24px_-8px_rgba(239,68,68,0.4)]',
  sky:     'hover:shadow-[0_8px_24px_-8px_rgba(14,165,233,0.4)]',
  neutral: 'hover:shadow-lg',
  purple:  'hover:shadow-[0_8px_24px_-8px_rgba(168,85,247,0.4)]',
  teal:    'hover:shadow-[0_8px_24px_-8px_rgba(20,184,166,0.4)]',
};

interface Props<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderCard: (item: T) => React.ReactNode;
  /** Color del acento lateral (opcional). Default: 'primary' */
  accentColor?: (item: T) => AccentColor;
  /** Click handler en card completa (opcional). */
  onCardClick?: (item: T) => void;
  /** Columnas en desktop (xl). Mobile siempre 1, sm:2, lg:según props. Default 3. */
  columns?: 2 | 3 | 4;
  /** Empty state. */
  emptyState?: React.ReactNode;
  /** Compact mode: padding reducido + sin acento. */
  compact?: boolean;
  /** Override className del grid container. */
  className?: string;
}

export function DataCardGrid<T>({
  items,
  getKey,
  renderCard,
  accentColor,
  onCardClick,
  columns = 3,
  emptyState,
  compact = false,
  className,
}: Props<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[columns];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
  };
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={cn('grid gap-4', gridCols, className)}
    >
      {items.map((it) => {
        const color: AccentColor = accentColor?.(it) ?? 'primary';
        const accentCls = ACCENT_CLASSES[color];
        const glowCls = HOVER_GLOW[color];

        return (
          <motion.div
            key={getKey(it)}
            variants={item}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 380, damping: 24 } }}
            onClick={onCardClick ? () => onCardClick(it) : undefined}
            className={cn(
              'relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800',
              'shadow-sm transition-[shadow,border-color] duration-300',
              glowCls,
              'hover:border-primary/20',
              'before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[3px] before:rounded-r-full',
              accentCls,
              compact ? 'p-4' : 'p-5',
              onCardClick && 'cursor-pointer',
            )}
          >
            {renderCard(it)}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
