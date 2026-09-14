import { serverFetch } from '@/lib/server-api';
import ConveniosClient, { type Convenio } from './ConveniosClient';

/**
 * Server Component — fetch en el servidor (forward de JWT cookie a Laravel),
 * pasa data como prop al Client Component que mantiene búsqueda/filtros/descarga.
 * La paginación se controla vía searchParams (`?page=&per_page=`).
 */
export const dynamic = 'force-dynamic';

interface PaginatedResponse {
  data: Convenio[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default async function ConveniosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; per_page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number.parseInt(sp.page ?? '1', 10) || 1;
  const perPage = Number.parseInt(sp.per_page ?? '15', 10) || 15;

  let convenios: Convenio[] = [];
  let pagination = { current_page: page, last_page: 1, per_page: perPage, total: 0 };

  try {
    const raw = await serverFetch<PaginatedResponse | Convenio[]>(
      `/admin/convenios?page=${page}&per_page=${perPage}`,
    );
    if (Array.isArray(raw)) {
      convenios = raw;
      pagination = { current_page: 1, last_page: 1, per_page: perPage, total: raw.length };
    } else {
      convenios = Array.isArray(raw.data) ? raw.data : [];
      pagination = {
        current_page: raw.current_page ?? page,
        last_page: raw.last_page ?? 1,
        per_page: raw.per_page ?? perPage,
        total: raw.total ?? 0,
      };
    }
  } catch {
    convenios = [];
  }

  return <ConveniosClient convenios={convenios} pagination={pagination} />;
}
