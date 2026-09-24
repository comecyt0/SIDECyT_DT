import { serverFetch } from '@/lib/server-api';
import { ROLES } from '@/lib/roles';
import type { User, Solicitud } from '@/types/api';
import EvaluadoresClient, { type Evaluador } from './EvaluadoresClient';

/**
 * Server Component — fetch en el servidor (forward de JWT cookie a Laravel).
 * E45: los evaluadores salen de /admin/evaluadores-disponibles (todos los activos, solo nombre y foto), que también
 * puede leer el admin de convocatoria; la lista completa de usuarios (para los revisores) es solo del admin general,
 * así que se pide aparte y, si responde 403, simplemente no se muestran revisores. Las solicitudes llegan ya con el
 * alcance del usuario.
 */
export const dynamic = 'force-dynamic';

export default async function EvaluadoresPage() {
  let evaluadores: Evaluador[] = [];
  let revisores: Evaluador[] = [];
  let solicitudes: Solicitud[] = [];

  const [evalRaw, usersRaw, solRaw] = await Promise.all([
    serverFetch<{ id: number; name: string }[]>('/admin/evaluadores-disponibles').catch(() => []),
    serverFetch<User[] | { data: User[] }>('/admin/usuarios?per_page=1000').catch(() => []),
    serverFetch<Solicitud[] | { data: Solicitud[] }>('/admin/solicitudes').catch(() => []),
  ]);

  evaluadores = (Array.isArray(evalRaw) ? evalRaw : []).map((e) => ({ id: e.id, name: e.name, email: '', rol_id: ROLES.EVALUADOR }));
  const users: User[] = Array.isArray(usersRaw) ? usersRaw : (usersRaw?.data ?? []);
  revisores = users.filter((u) => u.rol_id === ROLES.REVISOR);
  solicitudes = Array.isArray(solRaw) ? solRaw : (solRaw?.data ?? []);

  return <EvaluadoresClient evaluadores={evaluadores} revisores={revisores} solicitudes={solicitudes} />;
}
