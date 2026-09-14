import { useEffect, useState } from 'react';

/**
 * Devuelve `true` mientras `loading` esté activo, garantizando un mínimo de
 * `minMs` milisegundos visible. Evita el "flash" de skeleton cuando la API
 * responde en < 100ms (el skeleton aparece y desaparece tan rápido que el
 * usuario lo percibe como un bug visual).
 *
 * Patrón estándar de UX moderna (Linear, Vercel, Resend lo usan):
 *   - API < minMs → skeleton se ve durante minMs (estable, premium feel)
 *   - API > minMs → skeleton se ve durante la duración real (sin overhead)
 *
 * @param loading  flag real de carga (de tu fetch)
 * @param minMs    duración mínima del estado de carga (default 400ms)
 */
export function useMinLoadingDuration(loading: boolean, minMs: number = 400): boolean {
  const [delayedLoading, setDelayedLoading] = useState(loading);

  useEffect(() => {
    if (loading) {
      setDelayedLoading(true);
      return;
    }
    const t = setTimeout(() => setDelayedLoading(false), minMs);
    return () => clearTimeout(t);
  }, [loading, minMs]);

  return delayedLoading;
}
