/**
 * E52 · F1 — Apoyo en especie (kits a clubes escolares): tipos, valores por defecto y validación de la configuración
 * de una convocatoria. Mismos límites que `AsistenteConvocatoriaController` / `EspecieConfigController` (backend).
 * Decisiones del usuario: docs/APOYO_EN_ESPECIE.md §11.
 */

export const TIPO_ESPECIE = 'especie';

export type Predef = { pedir: boolean; obligatorio: boolean };
export type Ambito = 'club' | 'integrante';
export type TipoCampoEspecie = 'text' | 'number' | 'textarea' | 'date' | 'select';

/** Pregunta personalizada del club o de cada integrante. `opciones`: una por línea (solo listas). */
export interface CampoEspecie {
  ambito: Ambito;
  nombre_campo: string;
  etiqueta: string;
  tipo_campo: TipoCampoEspecie;
  requerido: boolean;
  opciones: string;
}

export interface ConfigEspecie {
  min_integrantes: number;
  max_integrantes: number;
  /** '' = sin límite por escuela. */
  clubes_por_escuela: number | '';
  participan_menores: boolean;
  kit_nombre: string;
  kit_descripcion: string;
  campos_club: Record<string, Predef>;
  campos_integrante: Record<string, Predef>;
  campos: CampoEspecie[];
}

/** Predefinidos (mismas claves y etiquetas que `App\Support\Especie`). */
export const CAMPOS_CLUB: Record<string, string> = {
  logo: 'Logo o foto del club',
  descripcion: 'Descripción del proyecto del club',
};
export const CAMPOS_INTEGRANTE: Record<string, string> = {
  foto: 'Foto',
  fecha_nacimiento: 'Fecha de nacimiento',
  sexo: 'Sexo',
  curp: 'CURP',
  grado_grupo: 'Grado y grupo',
  correo: 'Correo',
  telefono: 'Teléfono',
};

const DEFAULT_CLUB: Record<string, Predef> = {
  logo: { pedir: true, obligatorio: false },
  descripcion: { pedir: true, obligatorio: false },
};
const DEFAULT_INTEGRANTE: Record<string, Predef> = {
  foto: { pedir: true, obligatorio: false },
  fecha_nacimiento: { pedir: true, obligatorio: true },
  sexo: { pedir: false, obligatorio: false },
  curp: { pedir: false, obligatorio: false },
  grado_grupo: { pedir: true, obligatorio: false },
  correo: { pedir: false, obligatorio: false },
  telefono: { pedir: false, obligatorio: false },
};

export const TIPO_CAMPO_ETIQUETA: Record<TipoCampoEspecie, string> = {
  text: 'Texto corto', textarea: 'Texto largo', number: 'Número', date: 'Fecha', select: 'Lista de opciones',
};

export const LIMITES_ESPECIE = { integrantes: 200, clubesPorEscuela: 1000, kitNombre: 255, kitDescripcion: 5000, etiqueta: 255, nombreCampo: 60, campos: 100 } as const;

export function configVacia(): ConfigEspecie {
  return {
    min_integrantes: 3,
    max_integrantes: 10,
    clubes_por_escuela: '',
    participan_menores: true,
    kit_nombre: '',
    kit_descripcion: '',
    campos_club: structuredClone(DEFAULT_CLUB),
    campos_integrante: structuredClone(DEFAULT_INTEGRANTE),
    campos: [],
  };
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const txt = (v: unknown, def = '') => (typeof v === 'string' ? v : def);
const ent = (v: unknown, def: number) => (typeof v === 'number' && Number.isInteger(v) ? v : def);

/** {clave: {pedir, obligatorio}} con solo claves conocidas; obligatorio implica pedir (igual que el backend). */
export function normalizarPredef(v: unknown, catalogo: Record<string, string>, defecto: Record<string, Predef>): Record<string, Predef> {
  const o = obj(v);
  const out: Record<string, Predef> = {};
  for (const k of Object.keys(catalogo)) {
    const x = obj(o[k]);
    const base = defecto[k] ?? { pedir: false, obligatorio: false };
    const obligatorio = typeof x.obligatorio === 'boolean' ? x.obligatorio : base.obligatorio;
    const pedir = obligatorio || (typeof x.pedir === 'boolean' ? x.pedir : base.pedir);
    out[k] = { pedir, obligatorio };
  }
  return out;
}

/** Opciones guardadas como [{id,label}] o texto → texto (una por línea) para editar. */
function opcionesATexto(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((o) => (o && typeof o === 'object' ? txt((o as Record<string, unknown>).label) : txt(o))).filter(Boolean).join('\n');
  return '';
}

/** JSON del servidor (GET /admin/convocatorias/{id}/especie) o de un borrador → configuración. No confía en tipos. */
export function leerConfig(datos: unknown): ConfigEspecie {
  const d = obj(datos);
  const v = configVacia();
  const cpe = d.clubes_por_escuela;
  return {
    min_integrantes: ent(d.min_integrantes, v.min_integrantes),
    max_integrantes: ent(d.max_integrantes, v.max_integrantes),
    clubes_por_escuela: typeof cpe === 'number' && Number.isInteger(cpe) && cpe > 0 ? cpe : '',
    participan_menores: typeof d.participan_menores === 'boolean' ? d.participan_menores : true,
    kit_nombre: txt(d.kit_nombre),
    kit_descripcion: txt(d.kit_descripcion),
    campos_club: normalizarPredef(d.campos_club, CAMPOS_CLUB, DEFAULT_CLUB),
    campos_integrante: normalizarPredef(d.campos_integrante, CAMPOS_INTEGRANTE, DEFAULT_INTEGRANTE),
    campos: (Array.isArray(d.campos) ? d.campos : []).slice(0, LIMITES_ESPECIE.campos).map((c) => {
      const x = obj(c);
      const tipo = txt(x.tipo_campo);
      return {
        ambito: x.ambito === 'integrante' ? 'integrante' : 'club',
        nombre_campo: txt(x.nombre_campo),
        etiqueta: txt(x.etiqueta),
        tipo_campo: (['text', 'number', 'textarea', 'date', 'select'].includes(tipo) ? tipo : 'text') as TipoCampoEspecie,
        requerido: x.requerido === true,
        opciones: opcionesATexto(x.opciones ?? x.opciones_json),
      };
    }),
  };
}

/** Cuerpo que esperan el asistente (`especie` + `campos`) y PUT /admin/convocatorias/{id}/especie. */
export function payloadConfig(c: ConfigEspecie) {
  return {
    min_integrantes: c.min_integrantes,
    max_integrantes: c.max_integrantes,
    clubes_por_escuela: c.clubes_por_escuela === '' ? null : c.clubes_por_escuela,
    participan_menores: c.participan_menores,
    kit_nombre: c.kit_nombre.trim(),
    kit_descripcion: c.kit_descripcion.trim() || null,
    campos_club: c.campos_club,
    campos_integrante: c.campos_integrante,
  };
}

export function payloadCampos(c: ConfigEspecie) {
  return c.campos.map((x, i) => ({
    ambito: x.ambito,
    nombre_campo: x.nombre_campo,
    etiqueta: x.etiqueta.trim(),
    tipo_campo: x.tipo_campo,
    requerido: x.requerido,
    orden: i + 1,
    opciones: x.tipo_campo === 'select' ? x.opciones : null,
  }));
}

/** Validación del lado del front (la del backend es la que manda). Devuelve {campo: mensaje}. */
export function validarConfig(c: ConfigEspecie): Record<string, string> {
  const e: Record<string, string> = {};
  const L = LIMITES_ESPECIE;
  if (!Number.isInteger(c.min_integrantes) || c.min_integrantes < 1 || c.min_integrantes > L.integrantes) e.min_integrantes = `El mínimo va de 1 a ${L.integrantes}.`;
  if (!Number.isInteger(c.max_integrantes) || c.max_integrantes < 1 || c.max_integrantes > L.integrantes) e.max_integrantes = `El máximo va de 1 a ${L.integrantes}.`;
  else if (c.max_integrantes < c.min_integrantes) e.max_integrantes = 'El máximo no puede ser menor que el mínimo.';
  if (c.clubes_por_escuela !== '' && (!Number.isInteger(c.clubes_por_escuela) || c.clubes_por_escuela < 1 || c.clubes_por_escuela > L.clubesPorEscuela)) {
    e.clubes_por_escuela = `Deja vacío para no limitar, o pon de 1 a ${L.clubesPorEscuela}.`;
  }
  if (!c.kit_nombre.trim()) e.kit_nombre = 'Escribe el nombre del kit.';
  else if (c.kit_nombre.length > L.kitNombre) e.kit_nombre = `Máximo ${L.kitNombre} caracteres.`;
  if (c.kit_descripcion.length > L.kitDescripcion) e.kit_descripcion = `Máximo ${L.kitDescripcion} caracteres.`;
  const vistos = new Set<string>();
  c.campos.forEach((x, i) => {
    const k = `${x.ambito}|${x.nombre_campo}`;
    if (!x.etiqueta.trim() || !x.nombre_campo) e.campos = `La pregunta ${i + 1} no tiene texto.`;
    else if (vistos.has(k)) e.campos = `La pregunta ${i + 1} se repite en el mismo ámbito; cambia su texto.`;
    else if (x.tipo_campo === 'select' && !x.opciones.split('\n').some((o) => o.trim())) e.campos = `La pregunta ${i + 1} es de lista y necesita opciones.`;
    vistos.add(k);
  });
  return e;
}

/** Identificador interno a partir del texto visible (igual que el asistente): "Talla de playera" → "talla_de_playera". */
export function slugCampo(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, LIMITES_ESPECIE.nombreCampo);
}

// ───────────────────────── Club (panel del líder y vista del personal) ─────────────────────────

export const ESTADO_CLUB: Record<string, { etiqueta: string; tono: string }> = {
  borrador: { etiqueta: 'En captura', tono: 'sky' },
  enviado: { etiqueta: 'En revisión', tono: 'violet' },
  observado: { etiqueta: 'Con observaciones', tono: 'gold' },
  subsanado: { etiqueta: 'Corregido', tono: 'violet' },
  aceptado: { etiqueta: 'Aceptado', tono: 'emerald' },
  rechazado: { etiqueta: 'No aceptado', tono: 'red' },
};

export const NIVEL_ESCUELA: Record<string, string> = {
  primaria: 'Primaria', secundaria: 'Secundaria', media_superior: 'Media superior', superior: 'Superior',
};
export const SISTEMA_ESCUELA: Record<string, string> = { estatal: 'Estatal', federal: 'Federal' };
export const SEXO: Record<string, string> = { H: 'Hombre', M: 'Mujer', X: 'Prefiere no decir' };

export interface EscuelaApi { id: number; cct: string; nombre: string; municipio: string; nivel: string; sistema: string }
export interface IntegranteApi {
  id: number; es_lider: boolean; nombre: string; fecha_nacimiento: string | null; sexo: string | null; curp: string | null;
  grado_grupo: string | null; correo: string | null; telefono: string | null; datos: Record<string, unknown> | null;
  foto_url: string | null; menor_de_edad: boolean | null;
}
export interface DocumentoClub {
  clave: string; nombre: string; descripcion?: string | null; obligatorio: boolean; formatos?: string[]; max_mb?: number;
  subido: { nombre_original: string; subido_at: string | null } | null;
}
export interface ClubApi {
  id: number; folio: string; nombre: string; estado: string; logo_url: string | null; datos: Record<string, unknown>;
  enviado_at: string | null; escuela: EscuelaApi | null; editable?: boolean;
  lider?: { name: string; email: string; telefono?: string | null; cargo?: string | null; municipio?: string | null } | null;
}

export const CARTA_ESCUELA = 'carta_escuela';

/** Formatos de archivo (mismas claves que `App\Support\TiposArchivo`) → `accept` del input y texto para la persona. */
export const ACCEPT_FORMATO: Record<string, string> = {
  pdf: 'application/pdf,.pdf',
  imagen: 'image/jpeg,image/png,image/webp',
  office: '.docx,.xlsx',
  zip: '.zip,application/zip',
};
export const ETIQUETA_FORMATO: Record<string, string> = { pdf: 'PDF', imagen: 'imagen (JPG, PNG o WebP)', office: 'Word o Excel', zip: 'ZIP' };
export const ACCEPT_IMAGEN = 'image/jpeg,image/png,image/webp';
export const IMAGEN_MAX_MB = 5;

/** Pregunta personalizada tal como la devuelve la API (opciones de lista como [{id,label}]). */
export interface CampoApi { ambito: Ambito; nombre_campo: string; etiqueta: string; tipo_campo: TipoCampoEspecie; opciones_json: { id: number | string; label: string }[] | null; requerido: boolean }

export function leerCamposApi(v: unknown): CampoApi[] {
  return (Array.isArray(v) ? v : []).filter((c) => c && typeof c === 'object' && typeof (c as CampoApi).nombre_campo === 'string').slice(0, LIMITES_ESPECIE.campos) as CampoApi[];
}

/** Respuesta guardada → texto para mostrar (las listas guardan el id de la opción). */
export function valorCampo(c: CampoApi, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (c.tipo_campo === 'select') {
    const o = (Array.isArray(c.opciones_json) ? c.opciones_json : []).find((x) => String(x.id) === String(v));
    return o ? String(o.label) : '—';
  }
  return String(v);
}

/** Solo se pintan imágenes servidas por la API del propio sistema (sesión + permiso), nunca URLs arbitrarias. */
export function mediaClubSegura(u: unknown): string | null {
  return typeof u === 'string' && /^\/api\/media\/club\/[A-Za-z0-9]{40}\.webp$/.test(u) ? u : null;
}
