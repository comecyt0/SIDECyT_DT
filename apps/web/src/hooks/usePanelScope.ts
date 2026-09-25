'use client';

import { useEffect } from 'react';

/**
 * Marca <html> con `sg-panel` mientras un panel (admin, solicitante, revisor, evaluador) está montado.
 * Los diálogos, selects y menús se renderizan en portales fuera de `.panel-root`; con esta clase también
 * reciben el sistema visual SIGAE (styles/panel-sigae.css). Al salir del panel (login, landing) se quita,
 * así el login no cambia. El primer render lo cubre `.panel-root`, y la pantalla de carga tapa la hidratación.
 */
export function usePanelScope(): void {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('sg-panel');
    return () => html.classList.remove('sg-panel');
  }, []);
}
