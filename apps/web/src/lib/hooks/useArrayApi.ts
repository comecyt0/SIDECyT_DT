'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

/**
 * ✅ HOOK REUTILIZABLE: useArrayApi
 *
 * Previene el patrón "undefined is not a function" que ocurría cuando:
 * - API retornaba array pero sin validación Array.isArray()
 * - Frontend intentaba .map()/.filter()/.slice() en dato no-array
 *
 * USO:
 * const { data: items, loading, error } = useArrayApi('/endpoint');
 * return (
 *   <div>
 *     {loading && <Loader />}
 *     {error && <Error msg={error} />}
 *     {!loading && items.length === 0 && <EmptyState />}
 *     {!loading && items.length > 0 && items.map(...)}
 *   </div>
 * );
 */

export interface UseArrayApiOptions {
  /** Endpoint path to fetch from */
  endpoint: string;
  /** Optional dependencies to re-run effect */
  deps?: React.DependencyList;
  /** Callback when data loads successfully */
  onSuccess?: (data: any[]) => void;
  /** Callback on error */
  onError?: (error: any) => void;
}

export function useArrayApi<T = any>(options: string | UseArrayApiOptions) {
  // Support both string and object parameter styles
  const config = typeof options === 'string'
    ? { endpoint: options }
    : options;

  const { endpoint, deps = [endpoint], onSuccess, onError } = config;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(endpoint);

        // ✅ CRITICAL: Validar que response.data es array ANTES de usar
        const items = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.data?.data) ? response.data.data : []);

        // ✅ Log para debugging

        setData(items);
        setError(null);

        // ✅ Callback success
        if (onSuccess) {
          onSuccess(items);
        }
      } catch (err: any) {
        // ✅ Fallback seguro a array vacío
        const errorMsg = err?.response?.data?.message ||
                        err?.message ||
                        `Error al cargar datos de ${endpoint}`;

        console.error(`[useArrayApi] Error en ${endpoint}:`, errorMsg);

        setData([]);
        setError(errorMsg);

        // ✅ Callback error
        if (onError) {
          onError(err);
        }
      } finally {
        // ✅ SIEMPRE set loading false
        setLoading(false);
      }
    };

    fetchData();
  }, deps);

  return { data, loading, error };
}

/**
 * Alias para casos comunes
 */
export const useApiArray = useArrayApi;
