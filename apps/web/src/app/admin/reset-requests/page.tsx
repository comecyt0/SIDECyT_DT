import { serverFetch } from '@/lib/server-api';
import ResetRequestsClient, { type ResetRequest } from './ResetRequestsClient';

export const dynamic = 'force-dynamic';

export default async function AdminResetRequestsPage() {
  let requests: ResetRequest[] = [];
  try {
    const raw = await serverFetch<ResetRequest[] | { data: ResetRequest[] }>('/admin/reset-requests');
    requests = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    requests = [];
  }
  return <ResetRequestsClient requests={requests} />;
}
