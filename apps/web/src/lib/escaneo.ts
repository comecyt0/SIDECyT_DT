/**
 * E52 · F4 — Escaneo en eventos: tipos y validación de las respuestas de /escaneo/* (se validan antes de pintarlas,
 * CLAUDE.md §0). El QR solo lleva un token opaco; el servidor decide qué club es y qué datos ve cada rol.
 */
import { mediaClubSegura } from '@/lib/especie';

// 02/10/2026: la «entrada» es la asistencia de siempre (tipo `asistencia`); se agregan salida y transporte (llegada y regreso).
export type ModoEscaneo = 'asistencia' | 'salida' | 'tr_llegada' | 'tr_regreso' | 'lunch' | 'kit';
export const esModo = (v: unknown): v is ModoEscaneo => typeof v === 'string' && ['asistencia', 'salida', 'tr_llegada', 'tr_regreso', 'lunch', 'kit'].includes(v);

export const MODOS: { valor: ModoEscaneo; etiqueta: string; ayuda: string }[] = [
  { valor: 'asistencia', etiqueta: 'Entrada', ayuda: 'Cuántas personas del club entran al evento' },
  { valor: 'salida', etiqueta: 'Salida', ayuda: 'Cuántas personas del club salen del evento' },
  { valor: 'tr_llegada', etiqueta: 'Transporte: llegada', ayuda: 'Cuántas personas llegan en el transporte' },
  { valor: 'tr_regreso', etiqueta: 'Transporte: regreso', ayuda: 'Cuántas personas suben al transporte de regreso' },
  { valor: 'lunch', etiqueta: 'Box lunch', ayuda: 'Cuántos box lunch se entregan (hasta lo aprobado)' },
  { valor: 'kit', etiqueta: 'Kit', ayuda: 'Entrega del kit y quién lo recibe' },
];

export interface EventoEscaneo { id: number; nombre: string; fecha: string | null; sede: string | null }
export interface ConvocatoriaEscaneo { id: number; nombre: string; eventos: EventoEscaneo[] }

export interface Registro { cantidad: number; metodo: 'qr' | 'manual'; hora: string | null; quien: string | null }
export interface FichaEscaneo {
  club: {
    id: number; folio: string; nombre: string; estado: string; logo_url: string | null;
    escuela: { nombre: string; municipio: string; sistema: string } | null;
    lider: { name: string; email?: string; telefono?: string | null } | null;
  };
  integrantes: { nombre: string; es_lider: boolean; foto_url: string | null; grado_grupo?: string | null; correo?: string | null; telefono?: string | null }[];
  sugerido_asistencia: number;
  evento: EventoEscaneo | null;
  asistencia: Registro | null;
  salida: Registro | null;
  lunch: Registro | null;
  lunch_aprobado: number | null;
  tr_llegada: Registro | null;
  tr_regreso: Registro | null;
  transporte_aprobado: number | null;
  kit: { nombre: string | null; entregado_at: string | null; recibio: string | null; entrego: string | null; lugar: string | null };
  ficha_completa: string | null;
}
export interface ResultadoBusqueda { id: number; folio: string; nombre: string; escuela: string | null; municipio: string | null }

const txt = (v: unknown, max = 255): string => (typeof v === 'string' ? v.slice(0, max) : '');
const txtN = (v: unknown, max = 255): string | null => (typeof v === 'string' && v !== '' ? v.slice(0, max) : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function evento(v: unknown): EventoEscaneo | null {
  const e = v as Record<string, unknown> | null;
  if (!e || typeof e !== 'object' || typeof e.id !== 'number') return null;
  return { id: e.id, nombre: txt(e.nombre, 150), fecha: txtN(e.fecha, 10), sede: txtN(e.sede) };
}

function registro(v: unknown): Registro | null {
  const r = v as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || num(r.cantidad) === null) return null;
  return { cantidad: r.cantidad as number, metodo: r.metodo === 'manual' ? 'manual' : 'qr', hora: txtN(r.hora, 40), quien: txtN(r.quien) };
}

export function leerConvocatorias(v: unknown): ConvocatoriaEscaneo[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 50).flatMap((c) => {
    const x = c as Record<string, unknown>;
    if (!x || typeof x.id !== 'number') return [];
    return [{ id: x.id, nombre: txt(x.nombre), eventos: Array.isArray(x.eventos) ? x.eventos.map(evento).filter((e): e is EventoEscaneo => e !== null) : [] }];
  });
}

export function leerFicha(v: unknown): FichaEscaneo | null {
  const d = v as Record<string, unknown> | null;
  const c = d?.club as Record<string, unknown> | undefined;
  if (!d || !c || typeof c.id !== 'number') return null;
  const esc = c.escuela as Record<string, unknown> | null;
  const lid = c.lider as Record<string, unknown> | null;
  const kit = (d.kit ?? {}) as Record<string, unknown>;
  return {
    club: {
      id: c.id, folio: txt(c.folio, 30), nombre: txt(c.nombre), estado: txt(c.estado, 30), logo_url: mediaClubSegura(c.logo_url),
      escuela: esc && typeof esc === 'object' ? { nombre: txt(esc.nombre), municipio: txt(esc.municipio, 120), sistema: txt(esc.sistema, 10) } : null,
      lider: lid && typeof lid === 'object' ? { name: txt(lid.name), email: txtN(lid.email) ?? undefined, telefono: txtN(lid.telefono, 20) } : null,
    },
    integrantes: Array.isArray(d.integrantes) ? d.integrantes.slice(0, 200).map((i) => {
      const x = i as Record<string, unknown>;
      return { nombre: txt(x.nombre), es_lider: x.es_lider === true, foto_url: mediaClubSegura(x.foto_url), grado_grupo: txtN(x.grado_grupo, 30), correo: txtN(x.correo), telefono: txtN(x.telefono, 20) };
    }) : [],
    sugerido_asistencia: num(d.sugerido_asistencia) ?? 1,
    evento: evento(d.evento),
    asistencia: registro(d.asistencia),
    salida: registro(d.salida),
    lunch: registro(d.lunch),
    lunch_aprobado: num(d.lunch_aprobado),
    tr_llegada: registro(d.tr_llegada),
    tr_regreso: registro(d.tr_regreso),
    transporte_aprobado: num(d.transporte_aprobado),
    kit: { nombre: txtN(kit.nombre), entregado_at: txtN(kit.entregado_at, 40), recibio: txtN(kit.recibio, 150), entrego: txtN(kit.entrego, 150), lugar: txtN(kit.lugar) },
    // Solo rutas internas de la ficha del club (nunca una URL arbitraria).
    ficha_completa: typeof d.ficha_completa === 'string' && /^\/admin\/clubes\/\d+$/.test(d.ficha_completa) ? d.ficha_completa : null,
  };
}

/** Registro ya hecho para el modo (null si no hay, o si es el kit). */
export function registroDe(f: FichaEscaneo, modo: ModoEscaneo): Registro | null {
  return modo === 'kit' ? null : f[modo];
}

/** Cantidad que se propone: lo ya registrado o, si no hay, integrantes, la entrada o lo aprobado. */
export function cantidadSugerida(f: FichaEscaneo, modo: ModoEscaneo): string {
  const r = registroDe(f, modo);
  if (r) return String(r.cantidad);
  if (modo === 'lunch') return f.lunch_aprobado ? String(f.lunch_aprobado) : '';
  if (modo === 'tr_llegada' || modo === 'tr_regreso') return f.transporte_aprobado ? String(f.transporte_aprobado) : '';
  if (modo === 'salida') return String(f.asistencia?.cantidad ?? f.sugerido_asistencia);
  return modo === 'kit' ? '' : String(f.sugerido_asistencia);
}

/** Texto del campo de cantidad según el modo. */
export function etiquetaCantidad(f: FichaEscaneo, modo: ModoEscaneo): string {
  switch (modo) {
    case 'asistencia': return `Personas que entran (integrantes: ${f.sugerido_asistencia})`;
    case 'salida': return `Personas que salen${f.asistencia ? ` (entraron: ${f.asistencia.cantidad})` : ''}`;
    case 'lunch': return `Box lunch que se entregan (aprobados: ${f.lunch_aprobado ?? 0})`;
    case 'tr_llegada': return `Personas que llegan en el transporte (aprobados: ${f.transporte_aprobado ?? 0})`;
    case 'tr_regreso': return `Personas que suben al regreso (aprobados: ${f.transporte_aprobado ?? 0})`;
    default: return '';
  }
}

/** Si el modo necesita algo aprobado que este club no tiene, el aviso (no se registra); si no, null. */
export function bloqueoModo(f: FichaEscaneo, modo: ModoEscaneo): string | null {
  if (modo === 'lunch' && !f.lunch_aprobado) return 'Este club no tiene box lunch aprobado para este evento.';
  if ((modo === 'tr_llegada' || modo === 'tr_regreso') && !f.transporte_aprobado) return 'Este club no tiene transporte aprobado para este evento.';
  return null;
}

export function leerBusqueda(v: unknown): ResultadoBusqueda[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 20).flatMap((r) => {
    const x = r as Record<string, unknown>;
    return x && typeof x.id === 'number' ? [{ id: x.id, folio: txt(x.folio, 30), nombre: txt(x.nombre), escuela: txtN(x.escuela), municipio: txtN(x.municipio, 120) }] : [];
  });
}

/** Mensaje claro para cada fallo de la cámara (permiso, sin cámara, página sin HTTPS…). */
export function mensajeCamara(e: unknown): string {
  const n = (e as { name?: string })?.name ?? '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'El navegador no dio permiso para usar la cámara. Actívalo en el candado de la barra de direcciones, o busca el club a mano.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No se encontró una cámara en este equipo. Busca el club a mano.';
  if (n === 'NotReadableError') return 'Otra aplicación está usando la cámara. Ciérrala e inténtalo de nuevo.';
  return 'No se pudo abrir la cámara. Busca el club a mano.';
}
