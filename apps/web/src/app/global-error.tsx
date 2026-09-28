'use client';

import { useEffect } from 'react';

/** Último recurso: error en el layout raíz. Debe traer su propio <html>/<body>. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('[app/global-error]', error.name, error.message, error.digest ?? '', error.stack ?? '');
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f7f4f5', color: '#2b1f24' }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: 'center', background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 14px 34px -24px rgba(60,20,40,.35)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fuera del árbol normal de Next */}
            <img src="/identidad/comecyt-color.png" alt="" width={166} height={72} style={{ margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />
            <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>No pudimos mostrar esta pantalla</h1>
            <p style={{ fontSize: 14, color: '#6b5a62', margin: 0 }}>Vuelve a cargar la página. Si se repite, avísanos indicando qué botón pulsaste.</p>
            {error.digest && <p style={{ fontSize: 11, color: '#8a7b82', marginTop: 12 }}>Referencia: {error.digest}</p>}
            <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 20, height: 44, padding: '0 20px', borderRadius: 14, border: 0, background: '#56212f', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Volver a cargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
