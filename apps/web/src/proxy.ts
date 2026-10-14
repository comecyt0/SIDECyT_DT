import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { construirCsp, generarNonce } from '@/lib/csp';
import { PANEL_POR_ROL, subrutaPermitida } from '@/lib/roles';

// Next.js 16: este archivo reemplaza a `middleware.ts` (deprecated).
// El comportamiento es idéntico — la convención cambió de nombre, no de API.

// `/sigae` es la landing pública (23/09/2026). `/privacidad` y `/terminos` se abren a quien no tiene
// sesión porque la landing los enlaza desde el pie: antes redirigían al login.
// 25/09/2026: `/` es el portal de los sistemas del COMECYT (SIGAE y SICEI).
// 14/10/2026 (E72): `/sicei` ya no es de esta app: IIS lo manda al Next de SICEI (basePath /sicei). Se quitó su página.
// 29/09/2026 (E52): `/registro` es el registro general (elige rol); `/solicitar-acceso` redirige ahí (308).
const PUBLIC_PATHS = [
  '/',
  '/sigae', '/login', '/forgot-password', '/reset-password', '/registro', '/privacidad', '/terminos',
];

/** Prefijo de ruta → roles autorizados a entrar.
 *  El rol se lee del JWT (payload no verificado aquí: el backend valida la firma en cada petición y es quien
 *  protege los datos). Este chequeo es defensa en profundidad: que nadie vea la interfaz de otro rol. */
const ROLE_PREFIXES: Record<string, string[]> = {
  // E45: el admin de convocatoria y la consulta usan las pantallas de /admin, pero solo las de SUBRUTAS_POR_ROL.
  '/admin':       ['admin', 'admin_convocatoria', 'consulta'],
  '/revisor':     ['revisor'],
  '/evaluador':   ['evaluador'],
  '/solicitante': ['solicitante'],
  // E52: panel del líder de club (Apoyo en especie).
  // E61: también el acompañante de club (líder B / director); qué puede hacer lo decide el servidor.
  '/club':        ['lider_club', 'acompanante_club'],
  // E52 · F4: escaneo en eventos.
  '/operador':    ['operador_evento'],
};

const DASHBOARD_BY_ROLE: Record<string, string> = PANEL_POR_ROL;

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
    case 5: return 'admin_convocatoria';
    case 6: return 'consulta';
    case 7: return 'lider_club';
    case 8: return 'operador_evento';
    case 9: return 'acompanante_club';
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

  // 25/09/2026: el sistema pasó de SIGAC a SIGAE. La dirección anterior de la landing redirige de forma permanente
  // (308) para no romper enlaces ya compartidos; conserva la búsqueda (?…) y el navegador conserva el #ancla.
  if (path === '/sigac' || path.startsWith('/sigac/')) {
    const destino = new URL(request.url);
    destino.pathname = '/sigae' + path.slice('/sigac'.length);
    return NextResponse.redirect(destino, 308);
  }

  // 29/09/2026 (E52): "Solicitar acceso" se reemplazó por el registro general. Los enlaces viejos siguen funcionando.
  if (path === '/solicitar-acceso') {
    const destino = new URL(request.url);
    destino.pathname = '/registro';
    return NextResponse.redirect(destino, 308);
  }

  // La raíz ya no redirige (25/09/2026): muestra el portal con los accesos a SIGAE y SICEI a todos. Quien tiene
  // sesión entra a su panel desde el botón de SIGAE (/login lo manda a su panel).

  if (esPublica) {
    // Con sesión válida, las pantallas de acceso llevan a su panel (la landing y las legales no).
    if (sesion && rol && ['/login', '/forgot-password', '/reset-password', '/registro'].includes(path)) {
      return NextResponse.redirect(new URL(DASHBOARD_BY_ROLE[rol], request.url));
    }
    return seguir(request);
  }

  // E72 paso 5: panel de evaluación compartido SIGAE/SICEI. Funciona con la sesión de CUALQUIERA de los dos sistemas
  // (quien solo evalúa en SICEI no tiene sesión de SIGAE); cada API valida la suya y la página decide qué mostrar.
  // No expone datos: todo viene de /api y /sicei/api con su propia autorización.
  const esPanelEvaluacion = path === '/evaluador' || /^\/evaluador\/(sigae|sicei)\/\d{1,10}$/.test(path);
  if (esPanelEvaluacion) {
    if (sesion && payload?.cambiar === true) {
      return NextResponse.redirect(new URL('/cambiar-contrasena', request.url));
    }
    return seguir(request);
  }

  if (!sesion || !rol) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // E61: cuenta con contraseña definida por un líder de club → primero la cambia (el servidor además bloquea el API).
  if (payload?.cambiar === true && path !== '/cambiar-contrasena') {
    return NextResponse.redirect(new URL('/cambiar-contrasena', request.url));
  }
  if (path === '/cambiar-contrasena' && payload?.cambiar !== true) {
    return NextResponse.redirect(new URL(DASHBOARD_BY_ROLE[rol], request.url));
  }

  for (const [prefix, allowed] of Object.entries(ROLE_PREFIXES)) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      if (!allowed.includes(rol) || !subrutaPermitida(rol, path)) {
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
  // E50: `identidad/<archivo>.(png|webp)` = logos oficiales públicos (public/identidad); solo esa carpeta y solo
  // un nivel con extensión de imagen, para no abrir otras rutas anidadas.
  matcher: [
    '/((?!_next/static|_next/image|identidad/[\\w-]+\\.(?:png|webp)$|favicon\\.ico$|logo\\.png$|logo-recortado\\.png$|logo-edomex\\.svg$|manifest\\.webmanifest$|sw\\.js$|robots\\.txt$|sitemap\\.xml$|[^/]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
