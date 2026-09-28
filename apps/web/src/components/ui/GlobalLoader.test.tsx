import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Ruta simulada que la prueba cambia para imitar una navegación de cliente (router.push).
let rutaActual = '/sigae';
vi.mock('next/navigation', () => ({ usePathname: () => rutaActual }));
vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

// Sin animación de salida (framer usa requestAnimationFrame, que los relojes falsos no avanzan).
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

import { GlobalLoaderProvider, useGlobalLoader } from './GlobalLoader';

function Encender() {
  const { setIsLoading } = useGlobalLoader();
  return <button onClick={() => setIsLoading(true)}>encender</button>;
}

const pantalla = () => screen.queryByRole('status');

// 28/09/2026: la landing encendía la pantalla de carga y navegaba al login con el router; nadie la apagaba y el login
// quedaba cubierto para siempre ("se queda atorado").
describe('GlobalLoader — nunca se queda atorado', () => {
  beforeEach(() => { vi.useFakeTimers(); rutaActual = '/sigae'; });
  afterEach(() => { vi.useRealTimers(); });

  it('se apaga sola cuando cambia la ruta (navegación de cliente)', () => {
    const { rerender } = render(<GlobalLoaderProvider><Encender /></GlobalLoaderProvider>);
    act(() => { screen.getByText('encender').click(); });
    expect(pantalla()).toBeInTheDocument();

    rutaActual = '/login';
    rerender(<GlobalLoaderProvider><Encender /></GlobalLoaderProvider>);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(pantalla()).not.toBeInTheDocument();
  });

  it('aunque nadie la apague ni cambie la ruta, desaparece a los 15 s', () => {
    render(<GlobalLoaderProvider><Encender /></GlobalLoaderProvider>);
    act(() => { screen.getByText('encender').click(); });
    act(() => { vi.advanceTimersByTime(14000); });
    expect(pantalla()).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(pantalla()).not.toBeInTheDocument();
  });
});
