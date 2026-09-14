'use client';

import { useEffect, useState } from 'react';
import { getProgramaCatalog } from '@/lib/api';

/**
 * Type Definitions for Dynamic Program Configuration
 */
export interface TipoPrograma {
  id: number;
  clave: string;
  nombre: string;
  tipo_apoyo: 'reembolso' | 'concurrente' | 'honorarios';
  tiene_etapas: boolean;
  num_etapas: number;
  tiene_equipo: boolean;
  min_miembros_equipo: number | null;
  max_miembros_equipo: number | null;
  rango_edad_min: number | null;
  rango_edad_max: number | null;
  monto_maximo: number | null;
  porcentaje_aportacion_solicitante: number;
  requiere_evaluacion_tecnica: boolean;
  requiere_fianza: boolean;
}

export interface ProgramaCampo {
  id: number;
  nombre_campo: string;
  etiqueta: string;
  tipo_campo: 'text' | 'number' | 'select' | 'date' | 'textarea';
  orden: number;
  requerido: boolean;
  etapa_id: number | null;
  opciones_json: Array<{ id: number; label: string }> | null;
  reglas_validacion_json: Record<string, any> | null;
}

export interface ProgramaRubro {
  id: number;
  clave: string;
  nombre: string;
  descripcion: string | null;
  porcentaje_maximo: number | null;
}

export interface ProgramaModalidad {
  id: number;
  clave: string;
  nombre: string;
  monto_maximo_especifico: number | null;
}

export interface ProgramaDocumento {
  id: number;
  clave: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  orden: number;
  formato_permitido?: string | null;
  tamaño_maximo_mb?: number | null;
}

export interface ProgramaEtapa {
  id: number;
  numero_etapa: number;
  nombre: string;
  descripcion: string | null;
}

export interface ProgramaCatalogState {
  programa: TipoPrograma | null;
  campos: ProgramaCampo[];
  rubros: ProgramaRubro[];
  modalidades: ProgramaModalidad[];
  etapas: ProgramaEtapa[];
  documentos: ProgramaDocumento[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook: useProgramaCatalog
 * Fetches and manages complete program configuration from API
 * Triggers fetch when tipoProgramaId changes
 * Resets state completely when tipoProgramaId is null/undefined
 */
export function useProgramaCatalog(
  tipoProgramaId: number | null | undefined
): ProgramaCatalogState {
  const [state, setState] = useState<ProgramaCatalogState>({
    programa: null,
    campos: [],
    rubros: [],
    modalidades: [],
    etapas: [],
    documentos: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    // Reset completely when no program selected
    if (!tipoProgramaId) {
      setState({
        programa: null,
        campos: [],
        rubros: [],
        modalidades: [],
        etapas: [],
        documentos: [],
        loading: false,
        error: null,
      });
      return;
    }

    // Fetch catalog when program ID changes
    const fetchCatalog = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await getProgramaCatalog(tipoProgramaId);

        setState({
          programa: data.programa || null,
          campos: data.campos || [],
          rubros: data.rubros || [],
          modalidades: data.modalidades || [],
          etapas: data.etapas || [],
          documentos: data.documentos || [],
          loading: false,
          error: null,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al cargar catálogo del programa';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    };

    fetchCatalog();
  }, [tipoProgramaId]);

  return state;
}
