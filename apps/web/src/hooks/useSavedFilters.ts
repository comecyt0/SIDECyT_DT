'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export interface SavedFilter<TFiltros = Record<string, unknown>> {
  id: number;
  scope: string;
  nombre: string;
  filtros: TFiltros;
  predeterminado: boolean;
  created_at?: string;
}

/**
 * Hook para listar / guardar / eliminar filtros del usuario en un scope.
 * Scope sugerido: 'admin.solicitudes', 'revisor.bandeja', 'evaluador.asignaciones', etc.
 */
export function useSavedFilters<TFiltros = Record<string, unknown>>(scope: string) {
  const [items, setItems] = useState<SavedFilter<TFiltros>[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<SavedFilter<TFiltros>[]>('/mis-preferencias', {
        params: { scope },
      });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (nombre: string, filtros: TFiltros, predeterminado = false) => {
      const { data } = await api.post<SavedFilter<TFiltros>>('/mis-preferencias', {
        scope,
        nombre,
        filtros,
        predeterminado,
      });
      await refresh();
      return data;
    },
    [scope, refresh],
  );

  const remove = useCallback(
    async (id: SavedFilter['id']) => {
      await api.delete(`/mis-preferencias/${id}`);
      setItems((prev) => prev.filter((p) => p.id !== id));
    },
    [],
  );

  const predeterminado = items.find((p) => p.predeterminado) ?? null;

  return { items, loading, save, remove, refresh, predeterminado };
}
