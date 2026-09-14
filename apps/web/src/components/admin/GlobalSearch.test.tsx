import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalSearch from './GlobalSearch';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);

describe('GlobalSearch', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no hace request con query menor a 2 caracteres', async () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Buscar folio/i);
    fireEvent.change(input, { target: { value: 'a' } });

    // El debounce es 250ms; esperamos un poco
    await new Promise((r) => setTimeout(r, 300));
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('hace request debounced con query ≥ 2 chars', async () => {
    mockedGet.mockResolvedValue({
      data: { solicitudes: [], usuarios: [], instituciones: [] },
    });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Buscar folio/i);
    fireEvent.change(input, { target: { value: 'biotec' } });

    await waitFor(
      () => {
        expect(mockedGet).toHaveBeenCalledWith('/admin/search', expect.objectContaining({ params: { q: 'biotec' } }));
      },
      { timeout: 1000 }
    );
  });

  it('renderiza resultados agrupados por categoría', async () => {
    mockedGet.mockResolvedValue({
      data: {
        solicitudes: [
          { id: 1, folio: 'X-2026-AAA', titulo_proyecto: 'Mi proyecto', estado: 'enviada', institucion: null },
        ],
        usuarios: [
          { id: 2, name: 'Juan Pérez', email: 'juan@x.mx', rol_id: 4, activo: true, rol: { id: 4, nombre: 'Solicitante', slug: 'solicitante' } },
        ],
        instituciones: [
          { id: 3, nombre: 'UAEMex', clave: 'UAE' },
        ],
      },
    });

    render(<GlobalSearch />);
    fireEvent.change(screen.getByPlaceholderText(/Buscar folio/i), { target: { value: 'mi' } });

    // El componente renderiza dropdown desktop + mobile, así que el texto aparece duplicado.
    // Verificamos que al menos un nodo lo contenga.
    await waitFor(() => {
      expect(screen.getAllByText('Mi proyecto').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UAEMex').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Solicitudes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Usuarios').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Empresas').length).toBeGreaterThan(0);
  });

  it('muestra estado vacío cuando no hay matches', async () => {
    mockedGet.mockResolvedValue({
      data: { solicitudes: [], usuarios: [], instituciones: [] },
    });
    render(<GlobalSearch />);
    fireEvent.change(screen.getByPlaceholderText(/Buscar folio/i), { target: { value: 'xyz' } });

    await waitFor(() => {
      expect(screen.getAllByText(/Sin resultados/i).length).toBeGreaterThan(0);
    });
  });
});
