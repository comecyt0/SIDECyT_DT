import { serverFetch } from '@/lib/server-api';
import type { AsignacionEvaluador } from '@/types/api';
import HistoricoClient from './HistoricoClient';

export const dynamic = 'force-dynamic';

export default async function EvaluadorHistoricoPage() {
  let asignaciones: AsignacionEvaluador[] = [];
  try {
    const raw = await serverFetch<AsignacionEvaluador[] | { data: AsignacionEvaluador[] }>(
      '/evaluador/asignaciones',
    );
    const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
    asignaciones = items.filter((a) => a.estado === 'concluido');
  } catch {
    asignaciones = [];
  }
  return <HistoricoClient asignaciones={asignaciones} />;
}
