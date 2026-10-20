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

/** E52 · F2 — Etapa de revisión (en orden). `id` solo existe en las ya guardadas. */
export type Revisa = 'revisor' | 'admin_convocatoria' | 'ambos';
export interface EtapaEspecie {
  id?: number;
  nombre: string;
  revisa: Revisa;
  plazo_horas: number;
  max_subsanaciones: number;
  /** E70: personas asignadas (ids) y aprobaciones necesarias para pasar a la siguiente etapa. */
  revisores?: number[];
  aprobaciones_requeridas?: number;
  /** 20/10/2026: tiene clubes o historial (no se puede quitar). */
  en_uso?: boolean;
}
export const REVISA_ETIQUETA: Record<Revisa, string> = {
  revisor: 'Revisor documental',
  admin_convocatoria: 'Admin de convocatoria',
  ambos: 'Cualquiera de los dos',
};
export const ETAPAS_DEFECTO: EtapaEspecie[] = [
  { nombre: 'Primera revisión', revisa: 'ambos', plazo_horas: 24, max_subsanaciones: 1 },
  { nombre: 'Segunda revisión', revisa: 'ambos', plazo_horas: 24, max_subsanaciones: 1 },
];
export const MAX_ETAPAS = 6;

export type Modalidad = 'estatal' | 'nacional' | 'internacional';
export const MODALIDADES: Record<Modalidad, string> = { estatal: 'Estatal', nacional: 'Nacional', internacional: 'Internacional' };
/** Valor desconocido → 'estatal' (el flujo de siempre). */
export function leerModalidad(v: unknown): Modalidad {
  return v === 'nacional' || v === 'internacional' ? v : 'estatal';
}

export interface ConfigEspecie {
  /** E52 · F2: etapas de revisión en orden. */
  etapas: EtapaEspecie[];
  min_integrantes: number;
  max_integrantes: number;
  /** '' = sin límite por escuela. */
  clubes_por_escuela: number | '';
  participan_menores: boolean;
  /** Modalidad de la convocatoria: estatal (flujo actual), nacional o internacional. */
  modalidad: Modalidad;
  kit_nombre: string;
  kit_descripcion: string;
  campos_club: Record<string, Predef>;
  campos_integrante: Record<string, Predef>;
  /** E79: formatos institucionales pedidos / obligatorios. */
  formatos: Record<string, Predef>;
  /** E86: kit diferenciado («Kit Nueva escuela» por integrante y «Kit» para escuelas que ya participaron). */
  kit_diferenciado: boolean;
  kits: KitsConfig;
  campos: CampoEspecie[];
  /** E71: apoyos de logística de la convocatoria y salida del transporte ('AAAA-MM-DDTHH:mm', hora del centro). */
  incluye_transporte: boolean;
  incluye_lunch: boolean;
  transporte_salida_lugar: string;
  transporte_salida_hora: string;
  transporte_regreso_lugar: string;
  transporte_regreso_hora: string;
  /** E87: enlace de Google Maps del punto de regreso (lo define el admin). */
  transporte_regreso_maps: string;
  /** 'AAAA-MM-DD' o '' (sin límite). */
  fecha_limite_logistica: string;
  /** E92: hasta cuándo el líder puede pedir cambios de integrante ('' = no se permiten). */
  fecha_limite_cambios: string;
}

/** Predefinidos (mismas claves y etiquetas que `App\Support\Especie`). */
export const CAMPOS_CLUB: Record<string, string> = {
  logo: 'Logo o foto del club',
  descripcion: 'Descripción del proyecto del club',
  // E79: llenan los formatos institucionales
  director_nombre: 'Nombre del director(a) de la escuela',
  lugar: 'Lugar (para los formatos)',
};
export const CAMPOS_INTEGRANTE: Record<string, string> = {
  foto: 'Foto',
  fecha_nacimiento: 'Fecha de nacimiento',
  sexo: 'Sexo',
  curp: 'CURP',
  grado_grupo: 'Grado y grupo',
  grado: 'Grado',
  grupo: 'Grupo',
  domicilio: 'Domicilio',
  tutor_nombre: 'Madre, padre o tutor (menores de edad)',
  correo: 'Correo',
  telefono: 'Teléfono',
};

const DEFAULT_CLUB: Record<string, Predef> = {
  logo: { pedir: true, obligatorio: false },
  descripcion: { pedir: true, obligatorio: false },
  director_nombre: { pedir: false, obligatorio: false },
  lugar: { pedir: false, obligatorio: false },
};
const DEFAULT_INTEGRANTE: Record<string, Predef> = {
  foto: { pedir: true, obligatorio: false },
  fecha_nacimiento: { pedir: true, obligatorio: true },
  sexo: { pedir: false, obligatorio: false },
  curp: { pedir: false, obligatorio: false },
  grado_grupo: { pedir: true, obligatorio: false },
  grado: { pedir: false, obligatorio: false },
  grupo: { pedir: false, obligatorio: false },
  domicilio: { pedir: false, obligatorio: false },
  tutor_nombre: { pedir: false, obligatorio: false },
  correo: { pedir: false, obligatorio: false },
  telefono: { pedir: false, obligatorio: false },
};

/**
 * E79 (20/10/2026) — Formatos institucionales (mismas claves que `App\Support\Especie::FORMATOS`): el sistema los
 * genera llenos y sin edición; el líder los firma y sube. La carta de la escuela sigue pedida y obligatoria por defecto.
 */
export const FORMATOS: Record<string, string> = {
  carta_escuela: 'Carta de consentimiento de la escuela',
  formato_a: 'Formato A · Carta de interés de participación',
  formato_b: 'Formato B · Constancia de integración del club',
  formato_c: 'Formato C · Integración del club de robótica',
  uso_imagen: 'Permiso de uso de imagen (uno por integrante)',
};
const DEFAULT_FORMATOS: Record<string, Predef> = {
  carta_escuela: { pedir: true, obligatorio: true },
  formato_a: { pedir: false, obligatorio: false },
  formato_b: { pedir: false, obligatorio: false },
  formato_c: { pedir: false, obligatorio: false },
  uso_imagen: { pedir: false, obligatorio: false },
};
/**
 * E87 — Enlace de Google Maps seguro para pintar como enlace (https y dominio de Google Maps; si no, null). Mismas reglas
 * que ApoyosLogistica::esMapa del servidor.
 */
export function urlMapa(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 500) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    const ok = ['maps.app.goo.gl', 'maps.google.com', 'maps.google.com.mx'].includes(h)
      || (h === 'goo.gl' && u.pathname.startsWith('/maps'))
      || (['google.com', 'www.google.com', 'google.com.mx', 'www.google.com.mx'].includes(h) && u.pathname.startsWith('/maps'));
    return ok ? u.toString() : null;
  } catch { return null; }
}

/** E86 — Kit diferenciado: lista personalizable de artículos por perfil. */
export interface ArticuloKit { articulo: string; cantidad: number }
export interface KitsConfig {
  nueva: { nombre: string; articulos: ArticuloKit[] };
  participo: { nombre: string; articulos: ArticuloKit[]; cantidad_por_club: number };
}
export const PERFIL_KIT: Record<string, string> = { nueva: 'Kit Nueva escuela', participo: 'Kit' };
export function kitsVacios(): KitsConfig {
  return { nueva: { nombre: 'Kit Nueva escuela', articulos: [] }, participo: { nombre: 'Kit', articulos: [], cantidad_por_club: 1 } };
}
export function leerKits(v: unknown): KitsConfig {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, Record<string, unknown> | undefined>;
  const arts = (x: unknown): ArticuloKit[] => (Array.isArray(x) ? x : []).slice(0, 50).map((a) => {
    const r = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
    return { articulo: typeof r.articulo === 'string' ? r.articulo.slice(0, 150) : '', cantidad: typeof r.cantidad === 'number' && Number.isInteger(r.cantidad) ? r.cantidad : 1 };
  });
  const base = kitsVacios();
  const n = o.nueva ?? {}; const p = o.participo ?? {};
  return {
    nueva: { nombre: typeof n.nombre === 'string' && n.nombre ? n.nombre : base.nueva.nombre, articulos: arts(n.articulos) },
    participo: { nombre: typeof p.nombre === 'string' && p.nombre ? p.nombre : base.participo.nombre, articulos: arts(p.articulos),
      cantidad_por_club: typeof p.cantidad_por_club === 'number' && Number.isInteger(p.cantidad_por_club) ? p.cantidad_por_club : 1 },
  };
}
/** Qué kit le toca a un club (respuesta de KitClub::resumen). */
export interface ResumenKit {
  /** 20/10/2026: false en modalidad nacional e internacional (sin kit). */
  aplica: boolean;
  diferenciado: boolean; perfil: 'nueva' | 'participo' | null; etiqueta: string; nombre: string; cantidad: number; por: 'club' | 'integrante';
  articulos: ArticuloKit[]; descripcion: string | null; forzado: boolean;
}
export function leerResumenKit(v: unknown): ResumenKit | null {
  const r = (v && typeof v === 'object' ? v : null) as Record<string, unknown> | null;
  if (!r || typeof r.etiqueta !== 'string') return null;
  return {
    aplica: r.aplica !== false, diferenciado: r.diferenciado === true, perfil: r.perfil === 'nueva' || r.perfil === 'participo' ? r.perfil : null, etiqueta: r.etiqueta,
    nombre: typeof r.nombre === 'string' ? r.nombre : '', cantidad: typeof r.cantidad === 'number' ? r.cantidad : 1, por: r.por === 'integrante' ? 'integrante' : 'club',
    articulos: leerKits({ nueva: { articulos: r.articulos } }).nueva.articulos, descripcion: typeof r.descripcion === 'string' ? r.descripcion : null, forzado: r.forzado === true,
  };
}

/** Estado de revisión de un documento subido (E79). */
export const ESTADO_DOCUMENTO: Record<string, { etiqueta: string; tono: string }> = {
  pendiente: { etiqueta: 'Por revisar', tono: 'violet' },
  aprobado: { etiqueta: 'Aprobado', tono: 'emerald' },
  rechazado: { etiqueta: 'Rechazado', tono: 'red' },
};

export const TIPO_CAMPO_ETIQUETA: Record<TipoCampoEspecie, string> = {
  text: 'Texto corto', textarea: 'Texto largo', number: 'Número', date: 'Fecha', select: 'Lista de opciones',
};

export const LIMITES_ESPECIE = { integrantes: 200, clubesPorEscuela: 1000, kitNombre: 255, kitDescripcion: 5000, etiqueta: 255, nombreCampo: 60, campos: 100 } as const;

export function configVacia(): ConfigEspecie {
  return {
    etapas: structuredClone(ETAPAS_DEFECTO),
    min_integrantes: 3,
    max_integrantes: 10,
    clubes_por_escuela: '',
    participan_menores: true,
    modalidad: 'estatal',
    kit_nombre: '',
    kit_descripcion: '',
    campos_club: structuredClone(DEFAULT_CLUB),
    campos_integrante: structuredClone(DEFAULT_INTEGRANTE),
    formatos: structuredClone(DEFAULT_FORMATOS),
    kit_diferenciado: false,
    kits: kitsVacios(),
    campos: [],
    incluye_transporte: true,
    incluye_lunch: true,
    transporte_salida_lugar: '',
    transporte_salida_hora: '',
    transporte_regreso_lugar: '',
    transporte_regreso_hora: '',
    transporte_regreso_maps: '',
    fecha_limite_logistica: '',
    fecha_limite_cambios: '',
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
  const etapas = (Array.isArray(d.etapas) ? d.etapas : []).slice(0, MAX_ETAPAS).map((e) => {
    const x = obj(e);
    const revisa = txt(x.revisa);
    return {
      ...(typeof x.id === 'number' && Number.isInteger(x.id) ? { id: x.id } : {}),
      nombre: txt(x.nombre, 'Revisión'),
      revisa: (['revisor', 'admin_convocatoria', 'ambos'].includes(revisa) ? revisa : 'ambos') as Revisa,
      plazo_horas: ent(x.plazo_horas, 24),
      max_subsanaciones: ent(x.max_subsanaciones, 1),
      revisores: Array.isArray(x.revisores) ? x.revisores.filter((r): r is number => typeof r === 'number' && Number.isInteger(r) && r > 0).slice(0, 20) : [],
      aprobaciones_requeridas: ent(x.aprobaciones_requeridas, 1),
      en_uso: x.en_uso === true,
    };
  });
  return {
    etapas: etapas.length ? etapas : v.etapas,
    min_integrantes: ent(d.min_integrantes, v.min_integrantes),
    max_integrantes: ent(d.max_integrantes, v.max_integrantes),
    clubes_por_escuela: typeof cpe === 'number' && Number.isInteger(cpe) && cpe > 0 ? cpe : '',
    participan_menores: typeof d.participan_menores === 'boolean' ? d.participan_menores : true,
    modalidad: leerModalidad(d.modalidad),
    kit_nombre: txt(d.kit_nombre),
    kit_descripcion: txt(d.kit_descripcion),
    campos_club: normalizarPredef(d.campos_club, CAMPOS_CLUB, DEFAULT_CLUB),
    campos_integrante: normalizarPredef(d.campos_integrante, CAMPOS_INTEGRANTE, DEFAULT_INTEGRANTE),
    formatos: normalizarPredef(d.formatos, FORMATOS, DEFAULT_FORMATOS),
    kit_diferenciado: d.kit_diferenciado === true,
    kits: leerKits(d.kits),
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
    incluye_transporte: d.incluye_transporte !== false,
    incluye_lunch: d.incluye_lunch !== false,
    transporte_salida_lugar: txt(d.transporte_salida_lugar),
    transporte_salida_hora: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(txt(d.transporte_salida_hora)) ? txt(d.transporte_salida_hora) : '',
    transporte_regreso_lugar: txt(d.transporte_regreso_lugar),
    transporte_regreso_hora: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(txt(d.transporte_regreso_hora)) ? txt(d.transporte_regreso_hora) : '',
    transporte_regreso_maps: txt(d.transporte_regreso_maps).slice(0, 500),
    fecha_limite_logistica: /^\d{4}-\d{2}-\d{2}$/.test(txt(d.fecha_limite_logistica)) ? txt(d.fecha_limite_logistica) : '',
    fecha_limite_cambios: /^\d{4}-\d{2}-\d{2}$/.test(txt(d.fecha_limite_cambios)) ? txt(d.fecha_limite_cambios) : '',
  };
}

/** Cuerpo que esperan el asistente (`especie` + `campos`) y PUT /admin/convocatorias/{id}/especie. */
export function payloadConfig(c: ConfigEspecie) {
  return {
    min_integrantes: c.min_integrantes,
    max_integrantes: c.max_integrantes,
    clubes_por_escuela: c.clubes_por_escuela === '' ? null : c.clubes_por_escuela,
    participan_menores: c.participan_menores,
    modalidad: c.modalidad,
    kit_nombre: c.kit_nombre.trim(),
    kit_descripcion: c.kit_descripcion.trim() || null,
    campos_club: c.campos_club,
    campos_integrante: c.campos_integrante,
    formatos: c.formatos,
    kit_diferenciado: c.kit_diferenciado,
    kits: c.kit_diferenciado ? {
      nueva: { nombre: c.kits.nueva.nombre.trim(), articulos: c.kits.nueva.articulos.filter((a) => a.articulo.trim()).map((a) => ({ articulo: a.articulo.trim(), cantidad: a.cantidad })) },
      participo: { nombre: c.kits.participo.nombre.trim(), cantidad_por_club: c.kits.participo.cantidad_por_club, articulos: c.kits.participo.articulos.filter((a) => a.articulo.trim()).map((a) => ({ articulo: a.articulo.trim(), cantidad: a.cantidad })) },
    } : undefined,
    // E71: apoyos (con transporte apagado el servidor borra la salida).
    incluye_transporte: c.incluye_transporte,
    incluye_lunch: c.incluye_lunch,
    transporte_salida_lugar: c.incluye_transporte ? c.transporte_salida_lugar.trim() || null : null,
    transporte_salida_hora: c.incluye_transporte && /T\d{2}:\d{2}$/.test(c.transporte_salida_hora) ? c.transporte_salida_hora : null,
    transporte_regreso_lugar: c.incluye_transporte ? c.transporte_regreso_lugar.trim() || null : null,
    transporte_regreso_hora: c.incluye_transporte && /T\d{2}:\d{2}$/.test(c.transporte_regreso_hora) ? c.transporte_regreso_hora : null,
    transporte_regreso_maps: c.incluye_transporte ? c.transporte_regreso_maps.trim() || null : null,
    fecha_limite_logistica: c.fecha_limite_logistica || null,
    fecha_limite_cambios: c.fecha_limite_cambios || null, // E92
    etapas: c.etapas.map((e) => ({
      ...(e.id ? { id: e.id } : {}), nombre: e.nombre.trim(), revisa: e.revisa, plazo_horas: e.plazo_horas, max_subsanaciones: e.max_subsanaciones,
      revisores: e.revisores ?? [], aprobaciones_requeridas: Math.max(1, e.aprobaciones_requeridas ?? 1),
    })),
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
  // 20/10/2026: en nacional e internacional no se entrega kit.
  if (c.modalidad === 'estatal' && !c.kit_nombre.trim()) e.kit_nombre = 'Escribe el nombre del kit.';
  else if (c.kit_nombre.length > L.kitNombre) e.kit_nombre = `Máximo ${L.kitNombre} caracteres.`;
  if (c.kit_descripcion.length > L.kitDescripcion) e.kit_descripcion = `Máximo ${L.kitDescripcion} caracteres.`;
  // E71: el regreso no puede ser antes de la salida (las dos en hora del centro, mismo formato → se comparan como texto).
  if (c.incluye_transporte && c.transporte_salida_hora && c.transporte_regreso_hora && c.transporte_regreso_hora < c.transporte_salida_hora) {
    e.transporte_regreso_hora = 'El regreso no puede ser antes de la salida.';
  }
  // E86: cantidades válidas en los kits diferenciados.
  if (c.kit_diferenciado) {
    const malas = [...c.kits.nueva.articulos, ...c.kits.participo.articulos].some((a) => a.articulo.trim() && (!Number.isInteger(a.cantidad) || a.cantidad < 1 || a.cantidad > 9999));
    if (malas) e.kits = 'Cada artículo necesita una cantidad de 1 a 9999.';
    else if (!Number.isInteger(c.kits.participo.cantidad_por_club) || c.kits.participo.cantidad_por_club < 1 || c.kits.participo.cantidad_por_club > 999) e.kits = 'Kits por club (escuelas que ya participaron): de 1 a 999.';
  }
  if (c.incluye_transporte && c.transporte_regreso_maps && !urlMapa(c.transporte_regreso_maps)) e.transporte_regreso_hora = 'El enlace del regreso debe ser de Google Maps.';
  if (c.etapas.length < 1) e.etapas = 'Agrega al menos una etapa de revisión.';
  else if (c.etapas.length > MAX_ETAPAS) e.etapas = `Máximo ${MAX_ETAPAS} etapas.`;
  else {
    const i = c.etapas.findIndex((x) => !x.nombre.trim() || x.nombre.length > 120 || !Number.isInteger(x.plazo_horas) || x.plazo_horas < 1 || x.plazo_horas > 720
      || !Number.isInteger(x.max_subsanaciones) || x.max_subsanaciones < 0 || x.max_subsanaciones > 5);
    if (i >= 0) e.etapas = `Revisa la etapa ${i + 1}: nombre (hasta 120 caracteres), plazo de 1 a 720 horas y de 0 a 5 correcciones.`;
    // E70: las aprobaciones no pueden ser más que las personas asignadas (sin personas, solo 1).
    const j = c.etapas.findIndex((x) => (x.aprobaciones_requeridas ?? 1) > Math.max(1, x.revisores?.length ?? 0));
    if (i < 0 && j >= 0) e.etapas = `Etapa ${j + 1}: pides más aprobaciones que personas asignadas.`;
  }
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
  vencido: { etiqueta: 'Plazo vencido', tono: 'red' },
  subsanado: { etiqueta: 'Corregido, en revisión', tono: 'violet' },
  aprobado_revision: { etiqueta: 'Aprobado en revisión', tono: 'teal' },
  aceptado: { etiqueta: 'Aceptado', tono: 'emerald' },
  kit_entregado: { etiqueta: 'Kit entregado', tono: 'emerald' },
  rechazado: { etiqueta: 'No aceptado', tono: 'red' },
};

// ───────────────────────── E52 · F3 — Logística ─────────────────────────

export const ESTADO_SOLICITUD: Record<string, { etiqueta: string; tono: string }> = {
  enviada: { etiqueta: 'Enviada · falta el formato firmado', tono: 'gold' },
  firmada: { etiqueta: 'Formato en revisión', tono: 'violet' },
  aprobada: { etiqueta: 'Aprobada', tono: 'emerald' },
  rechazada: { etiqueta: 'Rechazada · vuelve a enviarla', tono: 'red' },
  cancelada: { etiqueta: 'Cancelada', tono: 'neutral' },
};
export const ESTADO_FIRMADO: Record<string, { etiqueta: string; tono: string }> = {
  pendiente: { etiqueta: 'En revisión', tono: 'violet' },
  aprobado: { etiqueta: 'Aprobado', tono: 'emerald' },
  rechazado: { etiqueta: 'Rechazado', tono: 'red' },
  reemplazado: { etiqueta: 'Reemplazado', tono: 'neutral' },
};

export interface VersionFirmada {
  id: number; nombre_original: string; estado: string; motivo: string | null; subido_at: string; revisado_at: string | null; revisor: string | null;
  /** E90: los datos cambiaron después de subirla: hay que descargarla y subirla de nuevo. */
  desactualizado?: boolean;
}
export interface Cupo { total: number | null; usado: number; disponible: number | null }
export interface SolicitudLogistica {
  evento: { id: number; nombre: string; fecha: string | null; sede: string | null } | null;
  solicitud: { id: number; transporte: number; lunch: number; estado: string; enviada_at: string | null } | null;
  versiones: VersionFirmada[];
  cupo: { transporte: Cupo; lunch: Cupo };
}
export interface LogisticaEstado {
  aplica: boolean; estatal: boolean; modo: 'convocatoria' | 'evento'; abierta: boolean; fecha_limite: string | null;
  /** E91: el COMECYT ya habilitó la solicitud de transporte y/o box lunch. */
  habilitada: boolean;
  limites: { transporte: number | null; lunch: number | null }; tope_integrantes: boolean; acompanantes: number;
  max_integrantes: number; modalidad: Modalidad;
  /** E71: qué apoyos da la convocatoria y la salida/regreso del transporte ('AAAA-MM-DDTHH:mm' hora del centro o null). */
  apoyos: { incluye_transporte: boolean; incluye_lunch: boolean; transporte_salida_lugar: string | null; transporte_salida_hora: string | null;
    transporte_regreso_lugar: string | null; transporte_regreso_hora: string | null; transporte_regreso_maps?: string | null };
  /** E87: punto de salida que define el líder. */
  salida: { lugar: string | null; maps: string | null; hora: string | null };
  solicitudes: SolicitudLogistica[];
  resguardo: VersionFirmada[];
  kit: { resumen?: ResumenKit | null; nombre: string | null; fecha: string | null; lugar: string | null; asignado_at: string | null; entregado_at: string | null;
    entregado_lugar: string | null; entrego: string | null; recibio: string | null };
  /** F4 — QR del club: habilitado o qué le falta (el token nunca llega al front en JSON). */
  qr: { habilitado: boolean; habilitado_at: string | null; falta: string | null };
}

/** Respuesta de la API → estado de logística (o null si no aplica / forma inesperada). */
export function leerLogistica(v: unknown): LogisticaEstado | null {
  const d = v as Partial<LogisticaEstado> | null;
  if (!d || typeof d !== 'object' || d.aplica !== true) return null;
  return {
    aplica: true, habilitada: d.habilitada !== false, estatal: d.estatal === true, modo: d.modo === 'evento' ? 'evento' : 'convocatoria', abierta: d.abierta === true,
    fecha_limite: typeof d.fecha_limite === 'string' ? d.fecha_limite : null,
    limites: { transporte: typeof d.limites?.transporte === 'number' ? d.limites.transporte : null, lunch: typeof d.limites?.lunch === 'number' ? d.limites.lunch : null },
    tope_integrantes: d.tope_integrantes === true, acompanantes: Number(d.acompanantes) || 0,
    max_integrantes: Number(d.max_integrantes) || 10, modalidad: leerModalidad(d.modalidad),
    apoyos: (() => {
      const a = (d.apoyos && typeof d.apoyos === 'object' ? d.apoyos : {}) as Record<string, unknown>;
      const s = (x: unknown, n = 300) => (typeof x === 'string' && x.trim() ? x.slice(0, n) : null);
      const h = (x: unknown) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x) ? x : null);
      return { incluye_transporte: a.incluye_transporte !== false, incluye_lunch: a.incluye_lunch !== false,
        transporte_salida_lugar: s(a.transporte_salida_lugar), transporte_salida_hora: h(a.transporte_salida_hora),
        transporte_regreso_lugar: s(a.transporte_regreso_lugar), transporte_regreso_hora: h(a.transporte_regreso_hora), transporte_regreso_maps: urlMapa(a.transporte_regreso_maps) };
    })(),
    salida: (() => {
      const x = (d.salida && typeof d.salida === 'object' ? d.salida : {}) as Record<string, unknown>;
      return { lugar: typeof x.lugar === 'string' ? x.lugar.slice(0, 300) : null, maps: urlMapa(x.maps),
        hora: typeof x.hora === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x.hora) ? x.hora : null };
    })(),
    solicitudes: Array.isArray(d.solicitudes) ? d.solicitudes : [],
    resguardo: Array.isArray(d.resguardo) ? d.resguardo : [],
    kit: { ...(d.kit ?? { nombre: null, fecha: null, lugar: null, asignado_at: null, entregado_at: null, entregado_lugar: null, entrego: null, recibio: null }), resumen: leerResumenKit((d.kit as { resumen?: unknown } | undefined)?.resumen) },
    qr: {
      habilitado: d.qr?.habilitado === true,
      habilitado_at: typeof d.qr?.habilitado_at === 'string' ? d.qr.habilitado_at : null,
      falta: typeof d.qr?.falta === 'string' ? d.qr.falta.slice(0, 200) : null,
    },
  };
}

/** La versión vigente (la más reciente que no fue reemplazada). */
export function vigente(versiones: VersionFirmada[]): VersionFirmada | null {
  return versiones.find((v) => v.estado !== 'reemplazado') ?? null;
}

/** Historial: texto de cada resultado (el del líder no incluye quién resolvió). */
export const RESULTADO_HISTORIAL: Record<string, string> = {
  enviado: 'Enviado a revisión',
  aprobado: 'Etapa aprobada',
  aprobacion: 'Aprobación (faltan más revisores)', // E70: la etapa pide varias aprobaciones
  observado: 'Observaciones',
  subsanado: 'Correcciones enviadas',
  prorroga: 'Prórroga del plazo',
  rechazado: 'Rechazado en revisión',
  visto_bueno: 'Visto bueno del admin de convocatoria',
  comite_aceptado: 'Aceptado por el comité',
  comite_no_aceptado: 'No aceptado por el comité',
};

export interface AvanceClub {
  vence_at: string | null;
  ronda: number;
  etapa_actual: { id: number; orden: number; nombre: string; max_subsanaciones: number; plazo_horas: number; revisa: Revisa } | null;
  etapas: { orden: number; nombre: string }[];
  observacion: string | null;
  visto_bueno_at: string | null;
  comite_resultado: 'aceptado' | 'no_aceptado' | null;
  aceptado_at: string | null;
  rechazo_origen: 'revision' | 'comite' | null;
  rechazo_motivo: string | null;
  aviso_privacidad_at: string | null;
}

export interface EntradaHistorial {
  resultado: string; etapa: string | null; comentario: string | null; vence_at: string | null; horas: number | null; fecha: string;
  ronda?: number; rol?: string | null; quien?: string | null;
}

/** E71: 'AAAA-MM-DDTHH:mm' que ya viene en hora del centro → «15/10/2026, 3:30 p. m.» (sin convertir zonas). */
export function fechaHoraLocal(v: string | null | undefined): string {
  const m = v ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v) : null;
  if (!m) return '—';
  const h = Number(m[4]);
  return `${m[3]}/${m[2]}/${m[1]}, ${h % 12 === 0 ? 12 : h % 12}:${m[5]} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
}

/** Fecha y hora en la zona del negocio (Toluca), para plazos. */
export function fechaHora(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  // Hora en 12 h con a. m. / p. m. (pedido del usuario, E56).
  return d.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export const NIVEL_ESCUELA: Record<string, string> = {
  primaria: 'Primaria', secundaria: 'Secundaria', media_superior: 'Media superior', superior: 'Superior',
};
export const SISTEMA_ESCUELA: Record<string, string> = { estatal: 'Estatal', federal: 'Federal' };
export const SEXO: Record<string, string> = { H: 'Hombre', M: 'Mujer', X: 'Prefiere no decir' };

export interface EscuelaApi { id: number; cct: string; nombre: string; municipio: string; nivel: string; sistema: string; /** «Ya participó» / «Nueva escuela» (08/10/2026). */ participo_antes?: boolean }
export interface IntegranteApi {
  id: number; es_lider: boolean; es_lider_b?: boolean; nombre: string; fecha_nacimiento: string | null; sexo: string | null; curp: string | null;
  grado_grupo: string | null; correo: string | null; telefono: string | null; datos: Record<string, unknown> | null;
  foto_url: string | null; menor_de_edad: boolean | null;
  /** E79 */
  grado?: string | null; grupo?: string | null; domicilio?: string | null; tutor_nombre?: string | null;
}
export interface DocumentoClub {
  clave: string; nombre: string; descripcion?: string | null; obligatorio: boolean; formatos?: string[]; max_mb?: number;
  /** E79: el sistema lo genera lleno (carta, A, B, C o permiso de imagen) y su estado de revisión. */
  generable?: boolean; integrante_id?: number;
  subido: { nombre_original: string; subido_at: string | null; estado?: string; motivo?: string | null; /** E90 */ desactualizado?: boolean } | null;
}
/** E79: permiso de uso de imagen de un integrante (tarjeta del integrante). */
export interface PermisoImagen { tipo: 'menor' | 'adulto'; obligatorio: boolean; subido: DocumentoClub['subido'] }
/** Formatos que se generan en «Documentos» (el de imagen va en la tarjeta del integrante). */
export const FORMATOS_GENERABLES = ['carta_escuela', 'formato_a', 'formato_b', 'formato_c'];
export interface ClubApi extends Partial<AvanceClub> {
  id: number; folio: string; nombre: string; estado: string; logo_url: string | null; datos: Record<string, unknown>;
  enviado_at: string | null; escuela: EscuelaApi | null; editable?: boolean;
  /** E58: nombre corto de la convocatoria (los folios nuevos ya lo llevan dentro). */
  convocatoria_corto?: string | null;
  /** E55: escuela solicitada (en revisión o rechazada) mientras el club no tiene una del catálogo. */
  escuela_solicitud?: { id: number; cct: string; nombre: string; municipio: string; nivel: string; sistema: string; estado: 'pendiente' | 'aceptada' | 'rechazada'; motivo: string | null } | null;
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

/** E92 — Solicitudes de cambio de integrante y bajas del club (lista blanca del servidor). */
export type EstadoCambio = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
export interface SolicitudCambio {
  id: number; estado: EstadoCambio; sale: string; integrante_sale_id: number | null;
  entra: Record<string, string>; justificacion: string; motivo: string | null;
  tiene_foto: boolean; tiene_permiso: boolean; fecha: string | null; resuelto_at: string | null; resolvio?: string | null;
}
export interface CambiosClub {
  ventana: { abierta: boolean; hasta: string | null; motivo: string | null };
  solicitudes: SolicitudCambio[];
  bajas: { id: number; nombre: string; baja_at: string | null; motivo: string | null }[];
}
export const ESTADO_CAMBIO: Record<EstadoCambio, { etiqueta: string; tono: string }> = {
  pendiente: { etiqueta: 'Por resolver', tono: 'gold' },
  aprobada: { etiqueta: 'Aprobada', tono: 'emerald' },
  rechazada: { etiqueta: 'No aprobada', tono: 'red' },
  cancelada: { etiqueta: 'Cancelada', tono: 'neutral' },
};
export function leerCambios(v: unknown): CambiosClub | null {
  const d = v as Partial<CambiosClub> | null;
  if (!d || typeof d !== 'object' || !d.ventana) return null;
  const s = (x: unknown) => (typeof x === 'string' ? x : null);
  return {
    ventana: { abierta: d.ventana.abierta === true, hasta: s(d.ventana.hasta), motivo: s(d.ventana.motivo) },
    solicitudes: (Array.isArray(d.solicitudes) ? d.solicitudes : []).filter((x) => x && typeof x.id === 'number').map((x) => ({
      id: x.id, estado: (['pendiente', 'aprobada', 'rechazada', 'cancelada'] as const).includes(x.estado) ? x.estado : 'pendiente',
      sale: String(x.sale ?? ''), integrante_sale_id: typeof x.integrante_sale_id === 'number' ? x.integrante_sale_id : null,
      entra: Object.fromEntries(Object.entries(x.entra && typeof x.entra === 'object' ? x.entra : {}).filter(([, val]) => typeof val === 'string' || typeof val === 'number').map(([k, val]) => [k, String(val)])),
      justificacion: String(x.justificacion ?? ''), motivo: s(x.motivo), tiene_foto: x.tiene_foto === true, tiene_permiso: x.tiene_permiso === true,
      fecha: s(x.fecha), resuelto_at: s(x.resuelto_at), resolvio: s(x.resolvio),
    })),
    bajas: (Array.isArray(d.bajas) ? d.bajas : []).filter((x) => x && typeof x.id === 'number').map((x) => ({ id: x.id, nombre: String(x.nombre ?? ''), baja_at: s(x.baja_at), motivo: s(x.motivo) })),
  };
}
