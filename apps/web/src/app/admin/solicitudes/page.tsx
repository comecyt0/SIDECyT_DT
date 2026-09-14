import { serverFetch } from '@/lib/server-api';
import type { Solicitud } from '@/types/api';
import SolicitudesClient from './SolicitudesClient';

export const dynamic = 'force-dynamic';

interface PaginatedResponse {
  data: Solicitud[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface SP {
  searchParams?: Promise<{ page?: string; per_page?: string; search?: string }>;
}

export default async function AdminSolicitudesPage({ searchParams }: SP) {
  const sp = (await searchParams) ?? {};
  const page = Number.parseInt(sp.page ?? '1', 10) || 1;
  const perPage = Number.parseInt(sp.per_page ?? '15', 10) || 15;
  const search = sp.search ?? '';

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  if (search) params.set('search', search);

  let solicitudes: Solicitud[] = [];
  let pagination = { current_page: page, last_page: 1, per_page: perPage, total: 0 };

  try {
    const raw = await serverFetch<PaginatedResponse | Solicitud[]>(
      `/admin/solicitudes?${params.toString()}`,
    );
    if (Array.isArray(raw)) {
      solicitudes = raw;
      pagination = { current_page: 1, last_page: 1, per_page: perPage, total: raw.length };
    } else {
      solicitudes = Array.isArray(raw.data) ? raw.data : [];
      pagination = {
        current_page: raw.current_page ?? page,
        last_page: raw.last_page ?? 1,
        per_page: raw.per_page ?? perPage,
        total: raw.total ?? 0,
      };
    }
  } catch {
    solicitudes = [];
  }

  return (
    <SolicitudesClient
      solicitudes={solicitudes}
      pagination={pagination}
      initialSearch={search}
    />
  );
}
