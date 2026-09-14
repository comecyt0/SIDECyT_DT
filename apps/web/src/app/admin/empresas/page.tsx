import { serverFetch } from '@/lib/server-api';
import EmpresasClient, { type EmpresaRow } from './EmpresasClient';

/**
 * Server Component — RSC del módulo admin/empresas.
 *
 * Hace fetch en el servidor (forward de JWT cookie a Laravel), pasa data como
 * prop al Client Component que mantiene los modales + interactividad.
 * El POST/PUT desde el cliente llama a router.refresh() para reinvalidar.
 */
export const dynamic = 'force-dynamic';

export default async function EmpresasPage() {
  let empresas: EmpresaRow[] = [];
  try {
    const raw = await serverFetch<EmpresaRow[] | { data: EmpresaRow[] }>('/admin/empresas');
    empresas = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    empresas = [];
  }

  return <EmpresasClient empresas={empresas} />;
}
