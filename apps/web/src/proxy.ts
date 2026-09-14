import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js 16: este archivo reemplaza a `middleware.ts` (deprecated).
// El comportamiento es idéntico — la convención cambió de nombre, no de API.

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/solicitar-acceso'];

/** Prefijo de ruta → roles autorizados a entrar.
 *  El rol se lee del JWT (payload no firmado-verificado aquí: el backend
 *  valida la firma en cada request, este check es defensa en profundidad
 *  para evitar que el usuario manipule la URL desde el browser). */
const ROLE_PREFIXES: Record<string, string[]> = {
  '/admin':       ['admin'],
  '/revisor':     ['revisor'],
  '/evaluador':   ['evaluador'],
  '/solicitante': ['solicitante'],
};

const DASHBOARD_BY_ROLE: Record<string, string> = {
  admin: '/admin/dashboard',
  revisor: '/revisor/solicitudes',
  evaluador: '/evaluador/evaluaciones',
  solicitante: '/solicitante/dashboard',
};

/** Parsea el payload del JWT sin verificar firma. Edge-runtime safe (no usa Buffer).
 *  La validación criptográfica la hace el backend; aquí solo extraemos rol_id/role para
 *  decidir el redirect. Si el JWT está corrupto retornamos null y dejamos pasar
 *  para que el backend retorne 401. */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4));
    const json = atob(pad);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Mapea slug `rol` (backend usa español) o `rol_id` del JWT a slug canónico. */
function roleSlugFromPayload(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  // Backend Laravel emite claim 'rol' con el slug (ver User::getJWTCustomClaims)
  const slug =
    (typeof payload.rol === 'string' ? payload.rol : null) ??
    (typeof payload.role === 'string' ? payload.role : null);
  if (slug && DASHBOARD_BY_ROLE[slug]) return slug;
  const rolId = typeof payload.rol_id === 'number' ? payload.rol_id : null;
  switch (rolId) {
    case 1: return 'admin';
    case 2: return 'revisor';
    case 3: return 'evaluador';
    case 4: return 'solicitante';
    default: return null;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('comecyt_auth')?.value || request.cookies.get('token')?.value;
  const userRoleCookie = request.cookies.get('userRole')?.value;
  const path = request.nextUrl.pathname;

  // Permitir API proxy + assets + rutas públicas
  if (path.startsWith('/api/') || PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '?'))) {
    return NextResponse.next();
  }

  // Sin token → login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si ya hay sesión y se pide una ruta pública, redirigir a su dashboard
  if (token && PUBLIC_PATHS.includes(path)) {
    const destination = userRoleCookie
      ? (DASHBOARD_BY_ROLE[userRoleCookie] ?? '/solicitante/dashboard')
      : '/solicitante/dashboard';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Determinar rol — primero JWT (autoritativo), luego cookie como fallback
  const payload = parseJwtPayload(token);
  const rolFromJwt = roleSlugFromPayload(payload);
  const effectiveRole = rolFromJwt ?? userRoleCookie ?? null;

  // Verificar que el prefijo de la ruta sea compatible con el rol
  for (const [prefix, allowed] of Object.entries(ROLE_PREFIXES)) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      if (!effectiveRole || !allowed.includes(effectiveRole)) {
        // Rol no autorizado para este prefijo → mandar a su propio dashboard
        const home = effectiveRole && DASHBOARD_BY_ROLE[effectiveRole]
          ? DASHBOARD_BY_ROLE[effectiveRole]
          : '/login';
        return NextResponse.redirect(new URL(home, request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  // Excluimos del matcher todo lo que sirve Next.js estático (chunks, image optimizer)
  // y assets propios del dominio público (logo, manifest, service worker, íconos).
  // Si esto NO excluye un asset, el proxy lo redirige a /login y rompe imágenes,
  // PWA install (manifest), service worker (sw.js), etc.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|logo-edomex.svg|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico|.*\\.woff2?).*)',
  ],
};
