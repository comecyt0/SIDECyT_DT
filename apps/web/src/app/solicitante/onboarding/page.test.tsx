import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import api from '@/lib/api';
import SolicitanteOnboardingPage from './page';

const mockedGet = vi.mocked(api.get);
const mockedPut = vi.mocked(api.put);

describe('SolicitanteOnboardingPage', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    mockedGet.mockReset();
    mockedPut.mockReset();
  });

  it('redirige al dashboard si el usuario ya tiene institución', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/catalogos') return Promise.resolve({ data: { empresas: [] } });
      if (url === '/auth/me') return Promise.resolve({ data: { user: { id: 1, empresa_id: 42 } } });
      return Promise.resolve({ data: {} });
    });

    render(<SolicitanteOnboardingPage />);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/solicitante/dashboard');
    });
  });

  it('muestra el formulario cuando el usuario no tiene institución', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/catalogos') {
        return Promise.resolve({
          data: {
            empresas: [
              { id: 1, nombre: 'UAEMex', acronimo: 'UAE' },
              { id: 2, nombre: 'IPN', acronimo: 'IPN' },
            ],
          },
        });
      }
      return Promise.resolve({ data: { user: { id: 1, empresa_id: null, telefono: '', cargo: '' } } });
    });

    render(<SolicitanteOnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText(/Bienvenido a COMECYT/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('UAE — UAEMex')).toBeInTheDocument();
    expect(screen.getByText('IPN — IPN')).toBeInTheDocument();
  });

  it('valida que institución sea obligatoria al hacer submit', async () => {
    mockedGet.mockResolvedValue({ data: { user: { id: 1, empresa_id: null }, empresas: [] } });

    render(<SolicitanteOnboardingPage />);
    await waitFor(() => {
      expect(screen.getByText(/Bienvenido a COMECYT/i)).toBeInTheDocument();
    });

    // Simular submit con required HTML5 validation (no se llama PUT)
    fireEvent.submit(screen.getByRole('button', { name: /Continuar al sistema/i }).closest('form')!);
    // No se debe llamar PUT — el select tiene required
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('hace PUT /auth/profile y redirige tras submit válido', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/catalogos') {
        return Promise.resolve({ data: { empresas: [{ id: 5, nombre: 'X' }] } });
      }
      return Promise.resolve({ data: { user: { id: 1, empresa_id: null } } });
    });
    mockedPut.mockResolvedValue({ data: { user: { id: 1, empresa_id: 5 } } });

    render(<SolicitanteOnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: 'Investigador' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: '722000' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuar al sistema/i }));

    await waitFor(() => {
      expect(mockedPut).toHaveBeenCalledWith('/auth/profile', {
        empresa_id: 5,
        cargo: 'Investigador',
        telefono: '722000',
      });
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/solicitante/dashboard');
    });
  });
});
