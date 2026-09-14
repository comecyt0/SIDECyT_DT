import { cn } from '@/lib/utils';

/**
 * Placeholder animado (shimmer) para estados de carga.
 * Mejor percepción de tiempo que un spinner porque preserva la estructura
 * visual del contenido que va a aparecer.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

/** Skeleton para una stat card del dashboard. */
export function StatCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-9 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** Skeleton para una fila de tabla / item de lista. */
export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  );
}

/** Skeleton para una tarjeta de solicitud / asignación. */
export function CardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
