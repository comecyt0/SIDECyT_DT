/**
 * E72 paso 5 — Panel de evaluación compartido SIGAE / SICEI (/evaluador). Decisiones: docs/SICEI_BD_COMPARTIDA.md §6.4.
 *
 * Cada sistema tiene su propia sesión:
 *  - SIGAE: cookie HttpOnly `comecyt_auth` (JWT) → /api/…
 *  - SICEI: cookie HttpOnly `sicei_session` (Sanctum, path /sicei) → /sicei/api/…  El navegador la manda sola a
 *    /sicei/api aunque la página viva en /evaluador. Sanctum reconoce la petición como de su propio front por el
 *    Referer (mismo origen) y valida CSRF con `Sec-Fetch-Site: same-origin`.
 * Aquí se usa fetch (no lib/api.ts) para que un 401 de un sistema NO mande al login del otro: el panel decide.
 * Todas las respuestas se validan antes de pintarlas (Array.isArray, tipos).
 */

export type Sistema = 'sigae' | 'sicei';
export const SISTEMAS: Sistema[] = ['sigae', 'sicei'];
export const NOMBRE_SISTEMA: Record<Sistema, string> = { sigae: 'SIGAE', sicei: 'SICEI' };
export const SUBTITULO_SISTEMA: Record<Sistema, string> = {
  sigae: 'Apoyo Empresarial',
  sicei: 'Ciencia, Educación e Innovación',
};

export type EstadoAsignacion = 'asignado' | 'evaluando' | 'concluido' | 'vencida';

export interface Asignacion {
  id: number;
  folio: string;
  titulo: string | null;
  convocatoria: string;
  solicitante: string | null;
  modalidad: string | null;
  estado: EstadoAsignacion;
  fecha_limite: string | null;
  mi_dictamen: { puntaje: number; maximo: number; enviado_at: string | null } | null;
}

export interface Criterio { clave: string; nombre: string; descripcion?: string | null; max: number }

export interface Expediente {
  sistema: Sistema;
  id: number;
  folio: string;
  titulo: string | null;
  convocatoria: string;
  solicitante: string | null;
  modalidad: string | null;
  estado: EstadoAsignacion;
  fecha_limite: string | null;
  puede_enviar: boolean;
  respuestas: { titulo: string; campos: { etiqueta: string; valor: string | null }[] }[];
  documentos: { id: number; requisito: string; nombre: string; url?: string }[];
  rubrica: { criterios: Criterio[]; maximo: number; minimo_aprobatorio: number };
  mi_dictamen: { id: number | null; puntaje: number; comentario: string | null; criterios: Record<string, number> | null; enviado_at: string | null } | null;
}

export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; motivo: 'sin_sesion' | 'sin_rol' | 'no_encontrado' | 'error'; mensaje?: string; errores?: Record<string, string[]> };

const BASE: Record<Sistema, string> = { sigae: '/api', sicei: '/sicei/api' };

async function pedir<T>(sistema: Sistema, ruta: string, init: RequestInit = {}): Promise<Resultado<T>> {
  let res: Response;
  try {
    res = await fetch(BASE[sistema] + ruta, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        'X-Requested-With': 'XMLHttpRequest',
        ...(init.headers ?? {}),
      },
    });
  } catch {
    return { ok: false, motivo: 'error', mensaje: 'Sin conexión. Revisa tu red e intenta de nuevo.' };
  }
  let cuerpo: unknown = null;
  try { cuerpo = await res.json(); } catch { /* sin cuerpo */ }
  const c = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as { message?: unknown; mensaje?: unknown; errors?: unknown };
  const mensaje = typeof c.message === 'string' ? c.message : typeof c.mensaje === 'string' ? c.mensaje : undefined;
  if (res.ok) return { ok: true, datos: cuerpo as T };
  if (res.status === 401 || res.status === 419) return { ok: false, motivo: 'sin_sesion', mensaje };
  if (res.status === 403) return { ok: false, motivo: 'sin_rol', mensaje };
  if (res.status === 404) return { ok: false, motivo: 'no_encontrado', mensaje };
  const errores = c.errors && typeof c.errors === 'object' ? (c.errors as Record<string, string[]>) : undefined;
  return { ok: false, motivo: 'error', mensaje: mensaje ?? 'No se pudo completar la acción.', errores };
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const numero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const ESTADOS: EstadoAsignacion[] = ['asignado', 'evaluando', 'concluido', 'vencida'];

function aAsignacion(x: Record<string, unknown>): Asignacion | null {
  if (typeof x.id !== 'number' || typeof x.folio !== 'string') return null;
  const d = x.mi_dictamen as Record<string, unknown> | null;
  return {
    id: x.id,
    folio: x.folio,
    titulo: texto(x.titulo),
    convocatoria: texto(x.convocatoria) ?? '—',
    solicitante: texto(x.solicitante),
    modalidad: texto(x.modalidad),
    estado: ESTADOS.includes(x.estado as EstadoAsignacion) ? (x.estado as EstadoAsignacion) : 'asignado',
    fecha_limite: texto(x.fecha_limite),
    mi_dictamen: d && typeof d === 'object' ? { puntaje: numero(d.puntaje), maximo: numero(d.maximo) || 100, enviado_at: texto(d.enviado_at) } : null,
  };
}

export async function listar(sistema: Sistema): Promise<Resultado<Asignacion[]>> {
  const r = await pedir<{ datos?: unknown }>(sistema, '/evaluador/asignaciones');
  if (!r.ok) return r;
  const lista = Array.isArray(r.datos?.datos) ? r.datos.datos : [];
  return { ok: true, datos: lista.map((x) => aAsignacion(x as Record<string, unknown>)).filter((x): x is Asignacion => x !== null) };
}

export async function expediente(sistema: Sistema, id: number): Promise<Resultado<Expediente>> {
  const r = await pedir<Record<string, unknown>>(sistema, `/evaluador/asignaciones/${id}`);
  if (!r.ok) return r;
  const x = r.datos ?? {};
  const base = aAsignacion(x);
  if (!base) return { ok: false, motivo: 'error', mensaje: 'Respuesta inesperada del servidor.' };
  const rub = (x.rubrica ?? {}) as Record<string, unknown>;
  const criterios: Criterio[] = (Array.isArray(rub.criterios) ? rub.criterios : [])
    .map((c) => c as Record<string, unknown>)
    .filter((c) => typeof c.clave === 'string' && typeof c.nombre === 'string')
    .map((c) => ({ clave: c.clave as string, nombre: c.nombre as string, descripcion: texto(c.descripcion), max: numero(c.max) }));
  const md = x.mi_dictamen as Record<string, unknown> | null;
  return {
    ok: true,
    datos: {
      ...base,
      sistema,
      puede_enviar: x.puede_enviar === true,
      respuestas: (Array.isArray(x.respuestas) ? x.respuestas : []).map((s) => {
        const sec = s as Record<string, unknown>;
        return {
          titulo: texto(sec.titulo) ?? '',
          campos: (Array.isArray(sec.campos) ? sec.campos : []).map((c) => ({
            etiqueta: String((c as Record<string, unknown>).etiqueta ?? ''),
            valor: texto((c as Record<string, unknown>).valor),
          })),
        };
      }),
      documentos: (Array.isArray(x.documentos) ? x.documentos : [])
        .map((d) => d as Record<string, unknown>)
        .filter((d) => typeof d.id === 'number')
        .map((d) => ({ id: d.id as number, requisito: String(d.requisito ?? ''), nombre: String(d.nombre ?? 'documento.pdf'), url: texto(d.url) ?? undefined })),
      rubrica: { criterios, maximo: numero(rub.maximo) || 100, minimo_aprobatorio: numero(rub.minimo_aprobatorio) || 80 },
      mi_dictamen: md && typeof md === 'object' ? {
        id: typeof md.id === 'number' ? md.id : null,
        puntaje: numero(md.puntaje),
        comentario: texto(md.comentario),
        criterios: md.criterios && typeof md.criterios === 'object' ? (md.criterios as Record<string, number>) : null,
        enviado_at: texto(md.enviado_at),
      } : null,
    },
  };
}

export function iniciar(sistema: Sistema, id: number) {
  return pedir<unknown>(sistema, sistema === 'sigae' ? `/evaluador/asignaciones/${id}/iniciar-evaluacion` : `/evaluador/asignaciones/${id}/iniciar`, { method: 'PUT' });
}

/** Envía el dictamen. `puntajes` por clave de criterio (sin rúbrica en SICEI: {puntaje}). */
export function enviarDictamen(sistema: Sistema, id: number, puntajes: Record<string, number>, comentario: string, sinRubrica: boolean) {
  const cuerpo = sistema === 'sigae'
    ? { puntajes, comentarios_justificacion: comentario, carta_imparcialidad_aceptada: true }
    : { ...(sinRubrica ? { puntaje: puntajes.puntaje } : { criterios: puntajes }), comentario, carta_imparcialidad: true };
  return pedir<unknown>(sistema, `/evaluador/asignaciones/${id}/dictamen`, { method: 'POST', body: JSON.stringify(cuerpo) });
}

/** Descarga un documento del expediente como Blob PDF (para la vista previa dentro de la página). */
export async function documento(sistema: Sistema, idAsignacion: number, doc: { id: number; url?: string }): Promise<Blob> {
  const url = sistema === 'sigae'
    ? (doc.url && /^\/api\/archivos\/solicitudes\/\d+\/[A-Za-z0-9]{40}\.pdf$/.test(doc.url) ? doc.url : null)
    : `/sicei/api/evaluador/asignaciones/${idAsignacion}/documentos/${doc.id}`;
  if (!url) throw new Error('Documento no disponible');
  const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/pdf' } });
  if (!res.ok) throw new Error('No se pudo abrir el documento');
  return new Blob([await res.arrayBuffer()], { type: 'application/pdf' });
}

/** E72: PDF de un dictamen de SIGAE (lo puede bajar quien lo escribió y la administración; el servidor lo decide). */
export async function descargarDictamenSigae(idDictamen: number, nombre = 'Dictamen.pdf'): Promise<boolean> {
  if (!Number.isInteger(idDictamen) || idDictamen <= 0) return false;
  try {
    const res = await fetch(`/api/documentos/dictamen/${idDictamen}`, { credentials: 'same-origin', headers: { Accept: 'application/pdf' } });
    if (!res.ok) return false;
    const url = URL.createObjectURL(new Blob([await res.arrayBuffer()], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}

/** Persona con sesión en cada sistema (para el encabezado). */
export async function quienSoy(sistema: Sistema): Promise<{ nombre: string; rol?: string } | null> {
  const r = await pedir<Record<string, unknown>>(sistema, sistema === 'sigae' ? '/auth/me' : '/user');
  if (!r.ok) return null;
  const d = r.datos ?? {};
  const u = (d.user && typeof d.user === 'object' ? d.user : d) as Record<string, unknown>;
  const nombre = texto(u.name) ?? texto(u.nombre);
  const rol = (u.rol && typeof u.rol === 'object' ? (u.rol as Record<string, unknown>).slug : u.rol) as unknown;
  return nombre ? { nombre, rol: typeof rol === 'string' ? rol : undefined } : null;
}

/** Inicio de sesión en SICEI desde el panel (su propia sesión; con 2FA validado por SIGAE). */
export async function entrarSicei(email: string, password: string, codigo?: string) {
  try { await fetch('/sicei/sanctum/csrf-cookie', { credentials: 'same-origin' }); } catch { /* el POST lo reportará */ }
  return pedir<{ mfa_requerida?: boolean }>('sicei', '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, ...(codigo ? { codigo_totp: codigo } : {}) }),
  });
}

/** Días hasta la fecha límite (hora local). Negativo = vencida. */
export function diasRestantes(fecha: string | null): number | null {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [y, m, d] = fecha.split('-').map(Number);
  const hoy = new Date();
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((a - b) / 86400000);
}
