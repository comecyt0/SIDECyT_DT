import { serverFetch } from '@/lib/server-api';
import type { Informe } from '@/types/api';
import InformesClient from './InformesClient';

/**
 * Server Component — fetch en el servidor (forward de JWT cookie a Laravel),
 * pasa data como prop al Client Component que mantiene la interactividad.
 */
export const dynamic = 'force-dynamic';

export default async function InformesPage() {
  let informes: Informe[] = [];
  try {
    const raw = await serverFetch<Informe[] | { data: Informe[] }>('/admin/informes');
    informes = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    informes = [];
  }

  return <InformesClient informes={informes} />;
}
