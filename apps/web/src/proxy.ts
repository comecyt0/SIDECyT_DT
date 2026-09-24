import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { construirCsp, generarNonce } from '@/lib/csp';

// Next.js 16: este archivo reemplaza a `middleware.ts` (deprecated).
// El comportamiento es idéntico — la convención cambió de nombre, no de API.

// `/sigac` es la landing pública (23/09/2026). `/privacidad` y `/terminos` se abren a quien no tiene
// sesión porque la landing los enlaza desde el pie: antes redirigían al login.
const PUBLIC_PATHS = [
  '/sigac', '/login', '/forgot-password', '/reset-password', '/solicitar-acceso', '/privacidad', '/terminos',
];

/** Prefijo de ruta → roles autorizados a entrar.
 *  El rol se lee del JWT (payload no verificado aquí: el backend valida la firma en cada petición y es quien
 *  protege los datos). Este chequeo es defensa en profundidad: que nadie vea la interfaz de otro rol. */
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

/** Parsea el payload del JWT sin verificar firma. Si está corrupto devuelve null. */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4));
    return JSON.parse(atob(pad)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Mapea el claim `rol` (slug) o `rol_id` del JWT a slug canónico. */
function roleSlugFromPayload(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const slug =
    (typeof payload.rol === 'string' ? payload.rol : null) ??
    (typeof payload.role === 'string' ? payload.role : null);
  if (slug && DASHBOARD_BY_ROLE[slug]) return slug;
  switch (typeof payload.rol_id === 'number' ? payload.rol_id : null) {
    case 1: return 'admin';
    case 2: return 'revisor';
    case 3: return 'evaluador';
    case 4: return 'solicitante';
    default: return null;
  }
}

/** Deja pasar la petición con la CSP con nonce (ver lib/csp.ts). */
function seguir(request: NextRequest): NextResponse {
  const nonce = generarNonce();
  const csp = construirCsp(nonce);
  const headers = new Headers(request.headers);
  // Next.js lee el nonce de esta cabecera de la PETICIÓN y lo pone en sus propios <script>.
  headers.set('Content-Security-Policy', csp);
  headers.set('x-nonce', nonce);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // La API la atiende Laravel (IIS); si alguna llegara aquí, pasa sin tocar.
  if (path.startsWith('/api/')) return NextResponse.next();

  // SEGURIDAD (24/09/2026):
  //  - Solo cuenta la cookie HttpOnly `comecyt_auth`. La cookie heredada `token` es escribible desde JS
  //    (`document.cookie = 'token=x'` bastaba para "tener sesión" ante este archivo).
  //  - El rol sale SOLO del JWT. Antes, si no se podía leer, se usaba la cookie `userRole`, también escribible
  //    desde JS: `token=x; userRole=admin` abría la interfaz de /admin (los datos no, el backend responde 401).
  //  - Un JWT vencido es "sin sesión" (antes se aceptaba y rebotaba entre /login y el panel).
  const token = request.cookies.get('comecyt_auth')?.value ?? '';
  const payload = token ? parseJwtPayload(token) : null;
  const exp = payload && typeof payload.exp === 'number' ? payload.exp : null;
  const rol = roleSlugFromPayload(payload);
  const sesion = Boolean(rol) && (exp === null || exp * 1000 > Date.now());

  const esPublica = PUBLIC_PATHS.includes(path);

  // La raíz: sin sesión → landing; con sesión → su panel.
  if (path === '/') {
    return NextResponse.redirect(new URL(sesion && rol ? DASHBOARD_BY_ROLE[rol] : '/sigac', request.url));
  }

  if (esPublica) {
    // Con sesión válida, las pantallas de acceso llevan a su panel (la landing y las legales no).
    if (sesion && rol && ['/login', '/forgot-password', '/reset-password', '/solicitar-acceso'].includes(path)) {
      return NextResponse.redirect(new URL(DASHBOARD_BY_ROLE[rol], request.url));
    }
    return seguir(request);
  }

  if (!sesion || !rol) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  for (const [prefix, allowed] of Object.entries(ROLE_PREFIXES)) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      if (!allowed.includes(rol)) {
        return NextResponse.redirect(new URL(DASHBOARD_BY_ROLE[rol], request.url));
      }
      break;
    }
  }

  return seguir(request);
}

export const config = {
  // Se excluye lo que sirve Next.js estático y los assets propios. Las extensiones van ANCLADAS al final del
  // último segmento: antes `.*\.png` en cualquier posición saltaba el proxy (p. ej. `/admin/usuarios/x.png`).
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico$|logo\\.png$|logo-recortado\\.png$|logo-edomex\\.svg$|manifest\\.webmanifest$|sw\\.js$|robots\\.txt$|sitemap\\.xml$|[^/]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
