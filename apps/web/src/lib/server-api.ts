import 'server-only';

import { cookies, headers as nextHeaders } from 'next/headers';

// En el navegador NEXT_PUBLIC_API_URL es relativa ("/api"), pero fetch desde el servidor de Next
// necesita una URL absoluta. API_INTERNAL_URL se lee en tiempo de ejecución (entorno del servicio
// comecyt-web en NSSM), no queda horneada en el build.
const API_BASE =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Wrapper de fetch para Server Components / Server Actions.
 *
 * - Reenvía la cookie HttpOnly `comecyt_auth` (JWT) al backend Laravel para
 *   que `ReadJwtFromCookieMiddleware` la convierta en Bearer header
 * - Usa `cache: 'no-store'` por defecto (datos dinámicos por usuario)
 * - Lanza Error con status legible si el backend responde !== 2xx
 *
 * Uso típico desde un Server Component:
 *   const items = await serverFetch<Institucion[]>('/admin/empresas');
 */
export async function serverFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const cookieStore = await cookies();
  const auth = cookieStore.get('comecyt_auth')?.value;

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    // Reenvía la cookie tal cual; Laravel la lee desde Cookie header
    headers.set('Cookie', `comecyt_auth=${auth}`);
  }
  // 24/09/2026: estas llamadas salen del propio servidor (10.250.36.241), así que sin esto Laravel contaba a TODOS
  // los usuarios en un solo cubo de su límite por IP (300/min) y con carga respondía 429. Se reenvía la cadena
  // X-Forwarded-For que armaron el balanceador e IIS; Laravel confía en ella solo si la petición viene de un proxy
  // listado en TRUSTED_PROXIES y toma la IP no confiable más a la derecha, así que el cliente no puede falsificarla.
  const xff = (await nextHeaders()).get('x-forwarded-for');
  if (xff && !headers.has('X-Forwarded-For')) headers.set('X-Forwarded-For', xff);

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers,
    cache: init.cache ?? 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`serverFetch ${res.status} ${path}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
