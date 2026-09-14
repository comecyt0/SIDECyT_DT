import { RouteLoadingScreen } from '@/components/ui/GlobalLoader';

/**
 * Next.js muestra este archivo automáticamente mientras carga cualquier ruta que no
 * tenga su propio loading.tsx más específico — cubre la primera carga y los cambios
 * de página "sin excepción". Ver docs/DISENO_UI.md §Pantalla de carga.
 */
export default function Loading() {
  return <RouteLoadingScreen message="Cargando…" />;
}
