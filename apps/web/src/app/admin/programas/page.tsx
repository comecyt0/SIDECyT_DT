import { serverFetch } from '@/lib/server-api';
import ProgramasClient, { type TipoPrograma } from './ProgramasClient';

/**
 * Server Component — fetch en el servidor (forward de JWT cookie a Laravel),
 * pasa data como prop al Client Component que mantiene modal CRUD + interactividad.
 * Las mutaciones desde el cliente llaman a router.refresh() para reinvalidar.
 */
export const dynamic = 'force-dynamic';

export default async function ProgramasPage() {
  let programas: TipoPrograma[] = [];
  try {
    const raw = await serverFetch<TipoPrograma[] | { data: TipoPrograma[] }>('/admin/programas');
    programas = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    programas = [];
  }

  return <ProgramasClient programas={programas} />;
}
