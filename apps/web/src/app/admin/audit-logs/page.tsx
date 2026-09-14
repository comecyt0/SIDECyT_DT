import { serverFetch } from '@/lib/server-api';
import AuditLogsClient, { type AuditLogsPagination } from './AuditLogsClient';

export const dynamic = 'force-dynamic';

interface SP {
  searchParams?: Promise<{ action?: string; user_id?: string; from?: string; to?: string; page?: string }>;
}

const EMPTY: AuditLogsPagination = { data: [], current_page: 1, last_page: 1, per_page: 25, total: 0 };

export default async function AuditLogsPage({ searchParams }: SP) {
  const sp = (await searchParams) ?? {};
  const params = new URLSearchParams();
  if (sp.action) params.set('action', sp.action);
  if (sp.user_id) params.set('user_id', sp.user_id);
  if (sp.from) params.set('from', sp.from);
  if (sp.to) params.set('to', sp.to);
  if (sp.page) params.set('page', sp.page);
  params.set('per_page', '25');

  let logs: AuditLogsPagination = EMPTY;
  try {
    logs = await serverFetch<AuditLogsPagination>(`/admin/audit-logs?${params.toString()}`);
  } catch {
    logs = EMPTY;
  }

  return (
    <AuditLogsClient
      logs={logs}
      initialFilters={{
        action: sp.action ?? '',
        user_id: sp.user_id ?? '',
        from: sp.from ?? '',
        to: sp.to ?? '',
      }}
    />
  );
}
