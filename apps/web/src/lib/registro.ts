'use client';

import { useEffect, useState } from 'react';
import type { RolAutoservicio } from '@/lib/roles';

/**
 * E52 · Registro general — validaciones del front (primera capa; el backend repite todas: regla 9) y autollenado por
 * código postal (solo Estado de México). Reglas y decisiones: docs/APOYO_EN_ESPECIE.md §10.
 */

/** CURP oficial (RENAPO). Igual que App\Support\RegistroRoles::PATRON_CURP. */
export const PATRON_CURP =
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HMX](AS|B[CS]|C[CLMSH]|D[FG]|G[TR]|HG|JC|M[CNS]|N[ETL]|OC|PL|Q[TR]|S[PLR]|T[CSL]|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
export const PATRON_TELEFONO = /^\d{10}$/;
export const PATRON_RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i;
export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const ROL_REGISTRO: Record<RolAutoservicio, { titulo: string; para: string; detalle: string }> = {
  solicitante: {
    titulo: 'Participante',
    para: 'Empresas, emprendedores e instituciones',
    detalle: 'Postula tus proyectos a las convocatorias de Apoyo Empresarial (SIGAE). Al final registras los datos de tu empresa.',
  },
  lider_club: {
    titulo: 'Líder de club',
    para: 'Docentes y responsables de clubes escolares',
    detalle: 'Registra a tu club de una escuela estatal o federal en convocatorias de Apoyo en especie (kits). Tu club e integrantes se capturan después de aprobar tu cuenta.',
  },
  evaluador: {
    titulo: 'Evaluador',
    para: 'Especialistas e investigadores',
    detalle: 'Evalúa proyectos de las convocatorias. Te pediremos tu área, institución, grado académico y tu CV en PDF.',
  },
};

export const GRADO_ETIQUETA: Record<string, string> = {
  licenciatura: 'Licenciatura',
  especialidad: 'Especialidad',
  maestria: 'Maestría',
  doctorado: 'Doctorado',
  posdoctorado: 'Posdoctorado',
};

export interface Colonia { nombre: string; tipo: string | null }
export interface DomicilioCp { cp: string; estado: string; municipio: string; colonias: Colonia[] }

/**
 * Autollenado: al tener 5 dígitos consulta GET /api/codigos-postales/{cp} (catálogo oficial SEPOMEX del Estado de México).
 * Estados: idle · cargando · ok · fuera (no es del Estado de México) · error (sin conexión).
 */
export function useCodigoPostal(cp: string) {
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'ok' | 'fuera' | 'error'>('idle');
  const [datos, setDatos] = useState<DomicilioCp | null>(null);

  useEffect(() => {
    if (!/^\d{5}$/.test(cp)) {
      setEstado('idle');
      setDatos(null);
      return;
    }
    const ctrl = new AbortController();
    setEstado('cargando');
    fetch(`/api/codigos-postales/${cp}`, { credentials: 'omit', signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then(async (r) => {
        if (r.status === 404) { setEstado('fuera'); setDatos(null); return; }
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as Partial<DomicilioCp>;
        // Validar la forma antes de usarla (regla 6): el front no confía ciegamente en la respuesta.
        const colonias = Array.isArray(d.colonias)
          ? d.colonias.filter((c): c is Colonia => !!c && typeof c.nombre === 'string').map((c) => ({ nombre: c.nombre.slice(0, 150), tipo: typeof c.tipo === 'string' ? c.tipo : null }))
          : [];
        if (typeof d.municipio !== 'string' || colonias.length === 0) throw new Error('forma');
        setDatos({ cp, estado: String(d.estado ?? 'México'), municipio: d.municipio.slice(0, 120), colonias });
        setEstado('ok');
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setEstado('error');
        setDatos(null);
      });
    return () => ctrl.abort();
  }, [cp]);

  return { estado, datos };
}

/** Convierte los errores de validación de Laravel en una lista legible (el primero de cada campo). */
export function erroresServidor(e: unknown): string {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  if (d?.errors) return Object.values(d.errors).map((m) => m[0]).filter(Boolean).join(' · ');
  return d?.message || 'No se pudo enviar tu registro. Intenta de nuevo.';
}
