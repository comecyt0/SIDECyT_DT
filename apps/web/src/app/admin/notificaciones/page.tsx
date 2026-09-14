import { serverFetch } from '@/lib/server-api';
import type { NotificacionLog } from '@/types/api';
import NotificacionesClient from './NotificacionesClient';

export const dynamic = 'force-dynamic';

interface PaginatedResponse {
  data: NotificacionLog[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface SP {
  searchParams?: Promise<{ page?: string; per_page?: string }>;
}

const PER_PAGE = 20;

export default async function AdminNotificacionesPage({ searchParams }: SP) {
  const sp = (await searchParams) ?? {};
  const page = Number.parseInt(sp.page ?? '1', 10) || 1;
  const perPage = Number.parseInt(sp.per_page ?? String(PER_PAGE), 10) || PER_PAGE;

  let notifs: NotificacionLog[] = [];
  let pagination = { current_page: page, last_page: 1, per_page: perPage, total: 0 };

  try {
    const raw = await serverFetch<PaginatedResponse | NotificacionLog[]>(
      `/admin/notificaciones?page=${page}&per_page=${perPage}`,
    );
    if (Array.isArray(raw)) {
      notifs = raw;
      pagination = { current_page: 1, last_page: 1, per_page: perPage, total: raw.length };
    } else {
      notifs = Array.isArray(raw.data) ? raw.data : [];
      pagination = {
        current_page: raw.current_page ?? page,
        last_page: raw.last_page ?? 1,
        per_page: raw.per_page ?? perPage,
        total: raw.total ?? 0,
      };
    }
  } catch {
    notifs = [];
  }

  return <NotificacionesClient notifs={notifs} pagination={pagination} />;
}
