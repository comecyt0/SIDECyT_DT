import axios from 'axios';
import Cookies from 'js-cookie';
import * as Sentry from '@sentry/nextjs';

// En dev, si el env apunta a localhost/127.0.0.1 pero el navegador está en el otro,
// las cookies no propagan entre los dos hosts. Alineamos el hostname al de la página
// para que `comecyt_auth` (HttpOnly) realmente se guarde. En prod, NEXT_PUBLIC_API_URL
// apunta al dominio real y se respeta tal cual.
function resolveBaseURL(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  if (typeof window === 'undefined') return envUrl;
  try {
    const u = new URL(envUrl);
    const isLocalEnv = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    const pageHost = window.location.hostname;
    const isLocalPage = pageHost === 'localhost' || pageHost === '127.0.0.1';
    if (isLocalEnv && isLocalPage && u.hostname !== pageHost) {
      u.hostname = pageHost;
      return u.toString().replace(/\/$/, '');
    }
  } catch {
    /* fallthrough */
  }
  return envUrl;
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 30000, // 30 seconds timeout
  withCredentials: true, // Envía la cookie HttpOnly comecyt_auth automáticamente
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  transformResponse: [
    (data: unknown) => {
      // Handle responses that might have HTML prefix (from PHP dev server notices)
      if (typeof data === 'string') {
        // Trim whitespace first
        const trimmed = data.trim();

        // Check if it's an array response
        if (trimmed.startsWith('[')) {
          const jsonStart = trimmed.indexOf('[');
          const jsonEnd = trimmed.lastIndexOf(']');

          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            try {
              const jsonStr = trimmed.substring(jsonStart, jsonEnd + 1);
              return JSON.parse(jsonStr);
            } catch (e) {
              console.warn('Failed to parse array response:', e);
              return JSON.parse(trimmed);
            }
          }
        }

        // Check if it's an object response
        if (trimmed.startsWith('{')) {
          const jsonStart = trimmed.indexOf('{');
          const jsonEnd = trimmed.lastIndexOf('}');

          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            try {
              const jsonStr = trimmed.substring(jsonStart, jsonEnd + 1);
              return JSON.parse(jsonStr);
            } catch (e) {
              console.warn('Failed to parse object response:', e);
              return JSON.parse(trimmed);
            }
          }
        }
      }

      // Default behavior
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        return data;
      }
    }
  ]
});

// El JWT viaja en cookie HttpOnly (comecyt_auth); withCredentials la envía
// automáticamente. No hace falta interceptar el request.

// Acciones críticas que generan breadcrumb de Sentry para reconstruir contexto si algo falla.
// `match` se evalúa contra (method + url).
const CRITICAL_ACTIONS: Array<{ match: RegExp; category: string; message: (cfg: { method?: string; url?: string }) => string }> = [
  { match: /^POST\s.*\/auth\/login$/, category: 'auth', message: () => 'auth.login.attempt' },
  { match: /^POST\s.*\/auth\/logout$/, category: 'auth', message: () => 'auth.logout' },
  { match: /^POST\s.*\/auth\/refresh$/, category: 'auth', message: () => 'auth.refresh' },
  { match: /^POST\s.*\/solicitudes$/, category: 'solicitud', message: () => 'solicitud.create' },
  { match: /^POST\s.*\/solicitudes\/\d+\/enviar$/, category: 'solicitud', message: () => 'solicitud.enviar' },
  { match: /^POST\s.*\/revisor\/solicitudes\/\d+\/aprobar$/, category: 'revision', message: () => 'revisor.aprobar' },
  { match: /^POST\s.*\/revisor\/solicitudes\/\d+\/observar$/, category: 'revision', message: () => 'revisor.observar' },
  { match: /^POST\s.*\/evaluador\/asignaciones\/\d+\/dictamen$/, category: 'evaluacion', message: () => 'evaluador.dictamen' },
  { match: /^POST\s.*\/admin\/solicitudes\/\d+\/generar-convenio$/, category: 'convenio', message: () => 'convenio.generar' },
  { match: /^POST\s.*\/admin\/solicitudes\/\d+\/(rechazar|cancelar|cerrar|seguimiento)$/, category: 'solicitud', message: (cfg) => `admin.${cfg.url?.split('/').pop()}` },
];

function maybeBreadcrumb(method: string, url: string, status?: number, statusText?: string) {
  const key = `${method.toUpperCase()} ${url}`;
  const hit = CRITICAL_ACTIONS.find((a) => a.match.test(key));
  if (!hit) return;
  Sentry.addBreadcrumb({
    category: hit.category,
    message: hit.message({ method, url }),
    level: status && status >= 400 ? 'warning' : 'info',
    data: { url, method, status, statusText },
  });
}

api.interceptors.request.use((config) => {
  maybeBreadcrumb(config.method ?? 'GET', config.url ?? '');
  return config;
});

// Endpoints que NO deben dispararon auto-refresh (evita bucle infinito)
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'];

let refreshInFlight: Promise<unknown> | null = null;

function redirectToLogin() {
  Cookies.remove('userRole');
  Cookies.remove('userName');
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (response) => {
    maybeBreadcrumb(response.config.method ?? 'GET', response.config.url ?? '', response.status, response.statusText);
    return response;
  },
  async (error) => {
    if (error.config) {
      maybeBreadcrumb(error.config.method ?? 'GET', error.config.url ?? '', error.response?.status, error.response?.statusText);
    }
    // Handle timeout errors (ECONNABORTED)
    if (error.code === 'ECONNABORTED') {
      Sentry.captureMessage('API timeout (30s exceeded)', {
        level: 'warning',
        extra: {
          url: error.config?.url,
          method: error.config?.method,
        },
      });
    }

    const originalRequest = error.config;
    const status = error.response?.status;
    const reqUrl: string = originalRequest?.url ?? '';

    // 401 → intentar refresh una sola vez, luego retry, luego logout
    if (status === 401 && originalRequest && !originalRequest._retry && !NO_REFRESH_PATHS.some(p => reqUrl.includes(p))) {
      originalRequest._retry = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = api.post('/auth/refresh').finally(() => {
            refreshInFlight = null;
          });
        }
        await refreshInFlight;
        return api(originalRequest);
      } catch {
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    // 401 en endpoints sin posibilidad de refresh → logout directo
    if (status === 401) {
      redirectToLogin();
    }

    // Manejar API Gateway / Circuit Breaker 503
    if (status === 503) {
      console.error('Servicio No Disponible (Gateway/Circuit Breaker):', error.response?.data?.message);
    }

    // Report server errors (5xx) to Sentry
    if (status >= 500) {
      Sentry.captureException(error, {
        extra: {
          url: originalRequest?.url,
          method: originalRequest?.method,
          status,
          responseData: error.response?.data,
        },
      });
    }

    return Promise.reject(error);
  }
);

export default api;

/**
 * Fetch complete program configuration from dynamic catalogs
 */
export async function getProgramaCatalog(tipoProgramaId: number) {
  const res = await api.get(`/catalogs/programa/${tipoProgramaId}`);
  return res.data.data;
}
