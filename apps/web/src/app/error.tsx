'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

/** Pantalla de error de la aplicación (sustituye la genérica en inglés de Next.js). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app/error]', error.name, error.message, error.digest ?? '', error.stack ?? '');
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="app-card w-full max-w-lg p-8 text-center">
        <span className="app-tile-icon mx-auto mb-4" style={{ color: 'var(--auth-danger)' }}>
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-bold text-[var(--app-ink)]">No pudimos mostrar esta pantalla</h1>
        <p className="mt-2 text-sm text-[var(--app-ink-2)]">
          Ocurrió un problema al dibujar la página. Tus datos no se perdieron. Vuelve a cargar y, si se repite,
          avísanos indicando qué botón pulsaste.
        </p>
        {error.digest && <p className="mt-3 text-[11px] text-[var(--app-ink-2)]">Referencia: {error.digest}</p>}
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="auth-submit !w-auto !h-11 px-5 inline-flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Volver a cargar
          </button>
          <button type="button" onClick={reset} className="h-11 px-4 rounded-[14px] border font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-[var(--app-hover-bg)]" style={{ borderColor: 'var(--app-rule)', color: 'var(--app-ink)' }}>
            Intentar de nuevo sin recargar
          </button>
          <Link href="/" className="h-11 px-4 rounded-[14px] border font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-[var(--app-hover-bg)]" style={{ borderColor: 'var(--app-rule)', color: 'var(--app-ink)' }}>
            <Home className="h-4 w-4" aria-hidden="true" /> Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
