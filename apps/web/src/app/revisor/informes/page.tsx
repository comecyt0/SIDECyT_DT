import { serverFetch } from '@/lib/server-api';
import InformesClient, { type Informe } from './InformesClient';

export const dynamic = 'force-dynamic';

export default async function RevisorInformesPage() {
  let informes: Informe[] = [];
  try {
    const raw = await serverFetch<Informe[] | { data: Informe[] }>('/revisor/informes');
    informes = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    informes = [];
  }
  return <InformesClient informes={informes} />;
}
