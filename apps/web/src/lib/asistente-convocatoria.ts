/**
 * E47 (24/09/2026) — lógica pura del asistente "Nueva convocatoria": límites (iguales a los del backend), armado del
 * envío atómico, traducción de errores del servidor a "paso + texto entendible" y restauración segura de borradores.
 */

/** Mismos topes que `AsistenteConvocatoriaController::reglas()` (y que las columnas de la base). */
export const LIMITES = {
  nombreConvocatoria: 255,
  nombrePrograma: 255,
  clavePrograma: 20,
  etiquetaPregunta: 255,
  nombreDocumento: 255,
  nombreRubro: 255,
  claveRubro: 50,
  nombreCriterio: 255,
} as const;

/** Clave del programa: letras, números y _ - / . (p. ej. EMPRENDEDORES/2026). */
export const CLAVE_PROGRAMA_RE = /^[A-Za-z0-9_\-/.]+$/;

export interface CampoA { nombre_campo: string; etiqueta: string; tipo_campo: string; requerido: boolean; orden: number; opciones_json?: string }
export interface DocumentoA { clave: string; nombre: string; descripcion: string; obligatorio: boolean; orden: number; formatos: string[]; tamano_mb: number }
export interface RubroA { clave: string; nombre: string; descripcion: string; porcentaje_maximo: number }
export interface CriterioA { nombre: string; descripcion: string; ponderacion: number; puntaje_maximo: number; orden: number }
export interface EstadoAsistente {
  convocatoria: {
    nombre: string; ejercicio_fiscal: string; periodo_id: string; estado: string; descripcion: string;
    fecha_apertura: string; fecha_cierre: string; monto_maximo_apoyo: number; porcentaje_aportacion_minima: number;
  };
  programa: {
    clave: string; nombre: string; tipo_apoyo: string; monto_maximo: number; tiene_etapas: boolean; num_etapas: number;
    tiene_equipo: boolean; min_miembros_equipo: number; max_miembros_equipo: number; requiere_evaluacion_tecnica: boolean;
    puntaje_minimo_aprobatorio: number;
  };
  campos: CampoA[];
  documentos: DocumentoA[];
  rubros: RubroA[];
  criterios: CriterioA[];
}

/** Cuerpo de POST /admin/asistente-convocatoria. */
export function armarPayload(s: EstadoAsistente, borradorId: number | null) {
  return {
    borrador_id: borradorId,
    convocatoria: {
      ...s.convocatoria,
      periodo_id: s.convocatoria.periodo_id ? Number(s.convocatoria.periodo_id) : null,
    },
    programa: s.programa,
    campos: s.campos.map(({ opciones_json, ...c }) => ({ ...c, opciones: c.tipo_campo === 'select' ? (opciones_json ?? '') : null })),
    documentos: s.documentos,
    rubros: s.rubros,
    criterios: s.criterios,
  };
}

const SECCION_PASO: Record<string, number> = { convocatoria: 1, programa: 2, campos: 3, documentos: 4, rubros: 5, criterios: 6 };

/** "criterios.0.nombre" → 6. Desconocido → 7 (revisión). */
export function pasoDeError(clave: string): number {
  return SECCION_PASO[clave.split('.')[0]] ?? 7;
}

const CAMPO_LEGIBLE: Record<string, string> = {
  nombre: 'nombre', etiqueta: 'texto', clave: 'identificador', descripcion: 'descripción', opciones: 'opciones',
  ponderacion: 'peso', puntaje_maximo: 'calificación máxima', porcentaje_maximo: 'porcentaje máximo', tamano_mb: 'tamaño máximo',
  nombre_campo: 'identificador', tipo_campo: 'tipo de respuesta', fecha_apertura: 'fecha de apertura', fecha_cierre: 'fecha de cierre',
  monto_maximo_apoyo: 'apoyo máximo', porcentaje_aportacion_minima: 'aportación mínima', ejercicio_fiscal: 'ejercicio fiscal',
  periodo_id: 'periodo', monto_maximo: 'monto máximo', num_etapas: 'número de etapas', min_miembros_equipo: 'mínimo de integrantes',
  max_miembros_equipo: 'máximo de integrantes', puntaje_minimo_aprobatorio: 'calificación mínima', tipo_apoyo: 'forma del apoyo',
};

const ELEMENTO: Record<string, [string, (x: Record<string, unknown>) => unknown]> = {
  campos: ['Pregunta', (x) => x.etiqueta],
  documentos: ['Documento', (x) => x.nombre],
  rubros: ['Concepto de gasto', (x) => x.nombre],
  criterios: ['Criterio', (x) => x.nombre],
};

function recorte(t: unknown, n = 40): string {
  const s = typeof t === 'string' ? t.trim() : '';
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** Convierte un error del servidor en una línea que el admin entiende y sabe dónde corregir. */
export function describirError(clave: string, mensaje: string, s: EstadoAsistente): string {
  const partes = clave.split('.');
  const [seccion, idx, campo] = partes;
  if (ELEMENTO[seccion] && idx !== undefined && /^\d+$/.test(idx)) {
    const [etq, nombreDe] = ELEMENTO[seccion];
    const lista = (s as unknown as Record<string, Record<string, unknown>[]>)[seccion] ?? [];
    const nombre = recorte(nombreDe(lista[Number(idx)] ?? {}));
    return `${etq} ${Number(idx) + 1}${nombre ? ` «${nombre}»` : ''}${campo ? ` — ${CAMPO_LEGIBLE[campo] ?? campo}` : ''}: ${mensaje}`;
  }
  if (seccion === 'convocatoria' || seccion === 'programa') {
    const que = seccion === 'convocatoria' ? 'Convocatoria' : 'Programa';
    const etiqueta = seccion === 'programa' && idx === 'clave' ? 'clave corta' : (CAMPO_LEGIBLE[idx ?? ''] ?? idx ?? '');
    return `${que} — ${etiqueta}: ${mensaje}`;
  }
  const titulo: Record<string, string> = { campos: 'Preguntas', documentos: 'Documentos', rubros: 'Conceptos de gasto', criterios: 'Criterios' };
  return `${titulo[seccion] ?? 'Convocatoria'}: ${mensaje}`;
}

/** Errores 422 de Laravel → líneas legibles ordenadas por paso + primer paso con error. */
export function erroresDelServidor(errors: unknown, s: EstadoAsistente): { lineas: string[]; paso: number } | null {
  if (!errors || typeof errors !== 'object') return null;
  const pares = Object.entries(errors as Record<string, unknown>)
    .map(([k, v]) => [k, Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '')] as const)
    .filter(([, m]) => m)
    .sort((a, b) => pasoDeError(a[0]) - pasoDeError(b[0]));
  if (pares.length === 0) return null;
  return { lineas: pares.map(([k, m]) => describirError(k, m, s)), paso: pasoDeError(pares[0][0]) };
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function lista(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').slice(0, 100) as Record<string, unknown>[] : [];
}
const txt = (v: unknown, def = '') => (typeof v === 'string' ? v : def);
const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);

/**
 * Borrador guardado (JSON del servidor) → estado del asistente. Se reconstruye campo por campo sobre el estado vacío:
 * si el JSON trae tipos raros o campos de más, se ignoran (el borrador lo escribe el propio admin, pero no se confía).
 */
export function restaurarBorrador(datos: unknown, vacio: EstadoAsistente): EstadoAsistente {
  const d = obj(obj(datos).state ?? datos);
  const c = obj(d.convocatoria);
  const p = obj(d.programa);
  const v = vacio;
  return {
    convocatoria: {
      nombre: txt(c.nombre), ejercicio_fiscal: txt(c.ejercicio_fiscal, v.convocatoria.ejercicio_fiscal),
      periodo_id: txt(c.periodo_id), estado: 'borrador', descripcion: txt(c.descripcion),
      fecha_apertura: txt(c.fecha_apertura), fecha_cierre: txt(c.fecha_cierre),
      monto_maximo_apoyo: num(c.monto_maximo_apoyo, v.convocatoria.monto_maximo_apoyo),
      porcentaje_aportacion_minima: num(c.porcentaje_aportacion_minima, v.convocatoria.porcentaje_aportacion_minima),
    },
    programa: {
      clave: txt(p.clave), nombre: txt(p.nombre), tipo_apoyo: ['reembolso', 'concurrente', 'honorarios'].includes(txt(p.tipo_apoyo)) ? txt(p.tipo_apoyo) : v.programa.tipo_apoyo,
      monto_maximo: num(p.monto_maximo, v.programa.monto_maximo), tiene_etapas: bool(p.tiene_etapas, v.programa.tiene_etapas),
      num_etapas: num(p.num_etapas, v.programa.num_etapas), tiene_equipo: bool(p.tiene_equipo, v.programa.tiene_equipo),
      min_miembros_equipo: num(p.min_miembros_equipo, v.programa.min_miembros_equipo), max_miembros_equipo: num(p.max_miembros_equipo, v.programa.max_miembros_equipo),
      requiere_evaluacion_tecnica: bool(p.requiere_evaluacion_tecnica, v.programa.requiere_evaluacion_tecnica),
      puntaje_minimo_aprobatorio: num(p.puntaje_minimo_aprobatorio, v.programa.puntaje_minimo_aprobatorio),
    },
    campos: lista(d.campos).map((x, i) => ({
      nombre_campo: txt(x.nombre_campo), etiqueta: txt(x.etiqueta),
      tipo_campo: ['text', 'number', 'date', 'select', 'textarea'].includes(txt(x.tipo_campo)) ? txt(x.tipo_campo) : 'text',
      requerido: bool(x.requerido, false), orden: num(x.orden, i + 1), opciones_json: txt(x.opciones_json),
    })),
    documentos: lista(d.documentos).map((x, i) => ({
      clave: txt(x.clave), nombre: txt(x.nombre), descripcion: txt(x.descripcion), obligatorio: bool(x.obligatorio, false),
      orden: num(x.orden, i + 1), formatos: Array.isArray(x.formatos) ? x.formatos.filter((f): f is string => typeof f === 'string') : ['pdf'],
      tamano_mb: num(x.tamano_mb, 5),
    })),
    rubros: lista(d.rubros).map((x) => ({
      clave: txt(x.clave), nombre: txt(x.nombre), descripcion: txt(x.descripcion), porcentaje_maximo: num(x.porcentaje_maximo, 0),
    })),
    criterios: lista(d.criterios).map((x, i) => ({
      nombre: txt(x.nombre), descripcion: txt(x.descripcion), ponderacion: num(x.ponderacion, 0),
      puntaje_maximo: num(x.puntaje_maximo, 100), orden: num(x.orden, i + 1),
    })),
  };
}

/** ¿Hay algo capturado que valga la pena guardar como borrador? */
export function tieneContenido(s: EstadoAsistente): boolean {
  return Boolean(
    s.convocatoria.nombre.trim() || s.convocatoria.descripcion.trim() || s.convocatoria.fecha_apertura || s.convocatoria.fecha_cierre
    || s.programa.nombre.trim() || s.programa.clave.trim()
    || s.campos.length || s.documentos.length || s.rubros.length || s.criterios.length,
  );
}
