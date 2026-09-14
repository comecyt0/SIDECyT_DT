import { serverFetch } from '@/lib/server-api';
import type { User } from '@/types/api';
import UsuariosClient from './UsuariosClient';

/**
 * Server Component — fetch en el servidor (forward de JWT cookie a Laravel),
 * pasa data como prop al Client Component que mantiene los modales + interactividad.
 * Las mutaciones desde el cliente llaman a router.refresh() para reinvalidar.
 * La paginación se controla vía searchParams (`?page=&per_page=`).
 */
export const dynamic = 'force-dynamic';

interface PaginatedResponse {
  data: User[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; per_page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number.parseInt(sp.page ?? '1', 10) || 1;
  const perPage = Number.parseInt(sp.per_page ?? '15', 10) || 15;

  let users: User[] = [];
  let pagination = { current_page: page, last_page: 1, per_page: perPage, total: 0 };

  try {
    const raw = await serverFetch<PaginatedResponse | User[]>(
      `/admin/usuarios?page=${page}&per_page=${perPage}`,
    );
    if (Array.isArray(raw)) {
      users = raw;
      pagination = { current_page: 1, last_page: 1, per_page: perPage, total: raw.length };
    } else {
      users = Array.isArray(raw.data) ? raw.data : [];
      pagination = {
        current_page: raw.current_page ?? page,
        last_page: raw.last_page ?? 1,
        per_page: raw.per_page ?? perPage,
        total: raw.total ?? 0,
      };
    }
  } catch {
    users = [];
  }

  return <UsuariosClient users={users} pagination={pagination} />;
}
