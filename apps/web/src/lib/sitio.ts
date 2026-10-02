'use client';

import { useEffect, useState } from 'react';

/**
 * E49 (25/09/2026) — Contenido público administrable de las landings de SIDECyT (GET /api/sitio/{sigae|sicei}).
 * Todo se valida antes de pintarse (tipos, longitudes, enlaces): el front no confía ciegamente en la API.
 */

export type Sistema = 'sigae' | 'sicei';
export type Tono = 'sky' | 'mint' | 'peach';
export const ICONOS = ['wrench', 'graduation', 'rocket', 'network', 'lightbulb', 'award', 'shield', 'badge', 'book', 'flask', 'users', 'briefcase'] as const;
export type Icono = (typeof ICONOS)[number];
export const TONOS: Tono[] = ['sky', 'mint', 'peach'];

export interface ProgramaPublico {
  nombre: string;
  dirigido_a: string | null;
  resumen: string | null;
  correo: string | null;
  telefono: string | null;
  url_info: string | null;
  icono: Icono;
  tono: Tono;
  /** E54: convocatorias vigentes del programa (abierta, prórroga o próxima), máx. 3. */
  convocatorias: ConvocatoriaDePrograma[];
}
export type EstadoConvocatoriaPrograma = 'abierta' | 'prorroga' | 'proxima';
export interface ConvocatoriaDePrograma { nombre: string; estado: EstadoConvocatoriaPrograma; fecha_apertura: string | null; fecha_limite: string | null }
export interface DocumentoSitio { titulo: string; detalle: string }
export interface ContenidoSitio {
  programas: ProgramaPublico[];
  sectores: string[];
  documentos: DocumentoSitio[];
  documentos_notas: string[];
}

export const SITIO_VACIO: ContenidoSitio = { programas: [], sectores: [], documentos: [], documentos_notas: [] };

/** Mismos dominios que el backend (ContenidoSitioController::HOSTS_ENLACE). */
const HOSTS = ['comecyt.edomex.gob.mx', 'sidecyt-comecyt.edomex.gob.mx', 'edomex.gob.mx'];
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;

const txt = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export function enlaceSeguro(v: unknown): string | null {
  const s = txt(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && HOSTS.includes(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseSitio(raw: unknown): ContenidoSitio {
  if (!raw || typeof raw !== 'object') return SITIO_VACIO;
  const o = raw as Record<string, unknown>;
  const programas = Array.isArray(o.programas) ? o.programas.slice(0, 40).flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    const p = r as Record<string, unknown>;
    const nombre = txt(p.nombre, 255);
    if (!nombre) return [];
    const correo = txt(p.correo, 150);
    return [{
      nombre,
      dirigido_a: txt(p.dirigido_a, 400),
      resumen: txt(p.resumen, 1200),
      correo: correo && EMAIL_RE.test(correo) ? correo : null,
      telefono: txt(p.telefono, 60),
      url_info: enlaceSeguro(p.url_info),
      icono: (ICONOS as readonly string[]).includes(p.icono as string) ? (p.icono as Icono) : 'lightbulb',
      tono: TONOS.includes(p.tono as Tono) ? (p.tono as Tono) : 'sky',
      convocatorias: Array.isArray(p.convocatorias) ? p.convocatorias.slice(0, 3).flatMap((c) => {
        const x = c as Record<string, unknown>;
        const nombreC = x && typeof x === 'object' ? txt(x.nombre, 200) : null;
        const estado = x?.estado;
        if (!nombreC || (estado !== 'abierta' && estado !== 'prorroga' && estado !== 'proxima')) return [];
        const fecha = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
        return [{ nombre: nombreC, estado: estado as EstadoConvocatoriaPrograma, fecha_apertura: fecha(x.fecha_apertura), fecha_limite: fecha(x.fecha_limite) }];
      }) : [],
    }];
  }) : [];
  const lista = (v: unknown, max: number, largo: number) =>
    Array.isArray(v) ? v.slice(0, max).flatMap((s) => { const t = txt(s, largo); return t ? [t] : []; }) : [];
  const documentos = Array.isArray(o.documentos) ? o.documentos.slice(0, 20).flatMap((d) => {
    if (!d || typeof d !== 'object') return [];
    const titulo = txt((d as Record<string, unknown>).titulo, 120);
    return titulo ? [{ titulo, detalle: txt((d as Record<string, unknown>).detalle, 160) ?? '' }] : [];
  }) : [];
  return { programas, sectores: lista(o.sectores, 60, 60), documentos, documentos_notas: lista(o.documentos_notas, 10, 300) };
}

/** Carga el contenido público de un sistema (mismo origen, sin cookies). */
export function useSitio(sistema: Sistema): { estado: 'cargando' | 'listo' | 'error'; datos: ContenidoSitio } {
  const [s, setS] = useState<{ estado: 'cargando' | 'listo' | 'error'; datos: ContenidoSitio }>({ estado: 'cargando', datos: SITIO_VACIO });
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/sitio/${sistema}`, { signal: ctrl.signal, credentials: 'omit', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: unknown) => setS({ estado: 'listo', datos: parseSitio(j) }))
      .catch((e: unknown) => { if ((e as { name?: string })?.name !== 'AbortError') setS({ estado: 'error', datos: SITIO_VACIO }); });
    return () => ctrl.abort();
  }, [sistema]);
  return s;
}
