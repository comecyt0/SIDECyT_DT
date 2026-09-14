import { serverFetch } from '@/lib/server-api';
import type { Solicitud } from '@/types/api';
import SolicitudesClient from './SolicitudesClient';

export const dynamic = 'force-dynamic';

export default async function MisSolicitudesPage() {
  let solicitudes: Solicitud[] = [];
  try {
    const raw = await serverFetch<Solicitud[] | { data: Solicitud[] }>('/solicitudes');
    solicitudes = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    solicitudes = [];
  }
  return <SolicitudesClient solicitudes={solicitudes} />;
}
