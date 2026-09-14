import { serverFetch } from '@/lib/server-api';
import SolicitudesAccesoClient, { type SolicitudAcceso } from './SolicitudesAccesoClient';

export const dynamic = 'force-dynamic';

export default async function SolicitudesAccesoPage() {
  let solicitudes: SolicitudAcceso[] = [];
  try {
    const raw = await serverFetch<SolicitudAcceso[] | { data: SolicitudAcceso[] }>('/admin/solicitudes-acceso');
    solicitudes = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    solicitudes = [];
  }
  return <SolicitudesAccesoClient solicitudes={solicitudes} />;
}
