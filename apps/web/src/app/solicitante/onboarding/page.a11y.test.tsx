import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import SolicitanteOnboardingPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn((url: string) => {
      if (url === '/catalogos') {
        return Promise.resolve({
          data: {
            empresas: [
              { id: 1, nombre: 'Universidad Autónoma del Estado de México', acronimo: 'UAEMex' },
              { id: 2, nombre: 'Instituto Politécnico Nacional', acronimo: 'IPN' },
            ],
          },
        });
      }
      if (url === '/auth/me') {
        return Promise.resolve({
          data: { user: { id: 1, institucion_id: null, telefono: '', cargo: '' } },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('SolicitanteOnboardingPage — accesibilidad', () => {
  it('no tiene violaciones axe en el formulario inicial', async () => {
    const { container } = render(<SolicitanteOnboardingPage />);

    // Esperar a que termine la carga de catálogos y se vea el select (no el skeleton).
    await waitFor(() => {
      expect(container.querySelector('select#ob-inst')).toBeTruthy();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
