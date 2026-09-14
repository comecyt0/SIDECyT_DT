import { serverFetch } from '@/lib/server-api';
import type { ListaNegra, Empresa } from '@/types/api';
import ListaNegraClient from './ListaNegraClient';

/**
 * Server Component — fetch en el servidor (forward de JWT cookie a Laravel),
 * pasa data como prop al Client Component que mantiene los modales + interactividad.
 * Las mutaciones desde el cliente llaman a router.refresh() para reinvalidar.
 */
export const dynamic = 'force-dynamic';

export default async function ListaNegraPage() {
  let sanciones: ListaNegra[] = [];
  let empresas: Empresa[] = [];
  try {
    const [sanRaw, instRaw] = await Promise.all([
      serverFetch<ListaNegra[] | { data: ListaNegra[] }>('/admin/lista-negra'),
      serverFetch<Empresa[] | { data: Empresa[] }>('/admin/empresas'),
    ]);
    sanciones = Array.isArray(sanRaw) ? sanRaw : (sanRaw?.data ?? []);
    empresas = Array.isArray(instRaw) ? instRaw : (instRaw?.data ?? []);
  } catch {
    sanciones = [];
    empresas = [];
  }

  return <ListaNegraClient sanciones={sanciones} empresas={empresas} />;
}
