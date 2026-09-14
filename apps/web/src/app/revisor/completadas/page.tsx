import { serverFetch } from '@/lib/server-api';
import type { Solicitud } from '@/types/api';
import CompletadasClient from './CompletadasClient';

export const dynamic = 'force-dynamic';

export default async function RevisorCompletadasPage() {
  let solicitudes: Solicitud[] = [];
  try {
    const raw = await serverFetch<Solicitud[] | { data: Solicitud[] }>('/revisor/solicitudes/completadas');
    solicitudes = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    solicitudes = [];
  }
  return <CompletadasClient solicitudes={solicitudes} />;
}
