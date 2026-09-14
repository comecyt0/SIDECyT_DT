import { serverFetch } from '@/lib/server-api';
import { ROLES } from '@/lib/roles';
import type { User, Solicitud } from '@/types/api';
import EvaluadoresClient, { type Evaluador } from './EvaluadoresClient';

/**
 * Server Component — fetch en el servidor (forward de JWT cookie a Laravel).
 * Carga usuarios + solicitudes en paralelo, particiona por rol y los pasa al
 * Client Component que mantiene el modal de asignación. Las mutaciones llaman a
 * router.refresh() para reinvalidar.
 */
export const dynamic = 'force-dynamic';

export default async function EvaluadoresPage() {
  let evaluadores: Evaluador[] = [];
  let revisores: Evaluador[] = [];
  let solicitudes: Solicitud[] = [];

  try {
    const [usersRaw, solRaw] = await Promise.all([
      serverFetch<User[] | { data: User[] }>('/admin/usuarios?per_page=1000'),
      serverFetch<Solicitud[] | { data: Solicitud[] }>('/admin/solicitudes'),
    ]);

    const users: User[] = Array.isArray(usersRaw) ? usersRaw : (usersRaw?.data ?? []);
    evaluadores = users.filter((u) => u.rol_id === ROLES.EVALUADOR);
    revisores = users.filter((u) => u.rol_id === ROLES.REVISOR);
    solicitudes = Array.isArray(solRaw) ? solRaw : (solRaw?.data ?? []);
  } catch {
    evaluadores = [];
    revisores = [];
    solicitudes = [];
  }

  return <EvaluadoresClient evaluadores={evaluadores} revisores={revisores} solicitudes={solicitudes} />;
}
