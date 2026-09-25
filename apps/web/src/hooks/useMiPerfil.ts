'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export interface MiPerfil {
  id: number;
  name: string;
  email: string;
  telefono?: string | null;
  cargo?: string | null;
  created_at?: string;
  ultimo_acceso?: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  rol?: { id: number; nombre: string; slug: string } | null;
  empresa?: { id: number; nombre: string; acronimo?: string | null } | null;
  convocatorias_asignadas?: { id: number; nombre: string }[];
  periodos?: { id: number; nombre: string }[];
}

export interface ResumenPerfil {
  label: string;
  value: number;
}

const EVENTO = 'sigae:perfil-actualizado';
let cache: { user: MiPerfil; resumen: ResumenPerfil[] } | null = null;
let enCurso: Promise<{ user: MiPerfil; resumen: ResumenPerfil[] }> | null = null;

function cargar(forzar = false) {
  if (cache && !forzar) return Promise.resolve(cache);
  if (enCurso && !forzar) return enCurso;
  enCurso = api.get('/mi-perfil').then(({ data }) => {
    const user = data?.user as MiPerfil;
    const resumen = Array.isArray(data?.resumen) ? (data.resumen as ResumenPerfil[]) : [];
    cache = { user, resumen };
    return cache;
  }).finally(() => { enCurso = null; });
  return enCurso;
}

/** Perfil del usuario con sesión (foto, portada, datos). Una sola petición compartida por toda la página (E45). */
export function useMiPerfil() {
  const [perfil, setPerfil] = useState<MiPerfil | null>(cache?.user ?? null);
  const [resumen, setResumen] = useState<ResumenPerfil[]>(cache?.resumen ?? []);

  useEffect(() => {
    let vivo = true;
    const aplicar = (d: { user: MiPerfil; resumen: ResumenPerfil[] }) => {
      if (!vivo) return;
      setPerfil(d.user);
      setResumen(d.resumen);
    };
    cargar().then(aplicar).catch(() => {});
    const alActualizar = () => { cargar(true).then(aplicar).catch(() => {}); };
    window.addEventListener(EVENTO, alActualizar);
    return () => { vivo = false; window.removeEventListener(EVENTO, alActualizar); };
  }, []);

  const refrescar = useCallback(() => { window.dispatchEvent(new Event(EVENTO)); }, []);
  return { perfil, resumen, refrescar };
}

/** Avisar a toda la página (barra, menú, chat) que la foto o los datos cambiaron. */
export function avisarPerfilActualizado() {
  window.dispatchEvent(new Event(EVENTO));
}
