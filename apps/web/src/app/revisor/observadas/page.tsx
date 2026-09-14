import { serverFetch } from '@/lib/server-api';
import type { Solicitud } from '@/types/api';
import ObservadasClient from './ObservadasClient';

export const dynamic = 'force-dynamic';

export default async function RevisorObservadasPage() {
  let solicitudes: Solicitud[] = [];
  try {
    const raw = await serverFetch<Solicitud[] | { data: Solicitud[] }>('/revisor/solicitudes/observadas');
    solicitudes = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    solicitudes = [];
  }
  return <ObservadasClient solicitudes={solicitudes} />;
}
