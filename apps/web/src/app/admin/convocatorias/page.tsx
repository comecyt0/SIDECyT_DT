import { serverFetch } from '@/lib/server-api';
import type { Convocatoria } from '@/types/api';
import ConvocatoriasClient from './ConvocatoriasClient';

/**
 * Server Component — fetch en el servidor (forward de JWT cookie a Laravel),
 * pasa data como prop al Client Component que mantiene los modales + interactividad.
 * Las mutaciones desde el cliente llaman a router.refresh() para reinvalidar.
 */
export const dynamic = 'force-dynamic';

export default async function ConvocatoriasPage() {
  let convocatorias: Convocatoria[] = [];
  try {
    const raw = await serverFetch<Convocatoria[] | { data: Convocatoria[] }>('/admin/convocatorias');
    convocatorias = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    convocatorias = [];
  }

  return <ConvocatoriasClient convocatorias={convocatorias} />;
}
