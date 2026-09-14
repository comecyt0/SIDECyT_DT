import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavedFiltersBar from './SavedFiltersBar';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedDelete = vi.mocked(api.delete);

describe('SavedFiltersBar', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedDelete.mockReset();
  });

  it('renderiza los filtros guardados como chips', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 1, scope: 'admin.solicitudes', nombre: 'Mis enviadas', filtros: { estado: 'enviada' }, predeterminado: false },
        { id: 2, scope: 'admin.solicitudes', nombre: 'Aprobadas 2026', filtros: { estado: 'aprobada' }, predeterminado: true },
      ],
    });

    render(<SavedFiltersBar scope="admin.solicitudes" currentFilters={{}} onApply={() => {}} />);

    expect(await screen.findByText('Mis enviadas')).toBeInTheDocument();
    expect(screen.getByText('Aprobadas 2026')).toBeInTheDocument();
  });

  it('al hacer click en un chip llama onApply con los filtros guardados', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 1, scope: 'admin.solicitudes', nombre: 'Mis enviadas', filtros: { estado: 'enviada' }, predeterminado: false },
      ],
    });
    const onApply = vi.fn();

    render(<SavedFiltersBar scope="admin.solicitudes" currentFilters={{}} onApply={onApply} />);

    const chip = await screen.findByText('Mis enviadas');
    fireEvent.click(chip);
    expect(onApply).toHaveBeenCalledWith({ estado: 'enviada' });
  });

  it('al hacer click en el ícono de basura elimina el filtro', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 7, scope: 'admin.solicitudes', nombre: 'X', filtros: {}, predeterminado: false },
      ],
    });
    mockedDelete.mockResolvedValue({ data: {} });

    render(<SavedFiltersBar scope="admin.solicitudes" currentFilters={{}} onApply={() => {}} />);

    const trash = await screen.findByLabelText('Eliminar filtro X');
    fireEvent.click(trash);

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith('/mis-preferencias/7');
    });
  });

  it('"+ guardar filtro actual" abre input y Enter guarda el filtro', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [{ id: 9, scope: 'admin.solicitudes', nombre: 'Nuevo', filtros: { estado: 'enviada' }, predeterminado: false }],
      });
    mockedPost.mockResolvedValue({
      data: { id: 9, scope: 'admin.solicitudes', nombre: 'Nuevo', filtros: { estado: 'enviada' }, predeterminado: false },
    });

    render(
      <SavedFiltersBar
        scope="admin.solicitudes"
        currentFilters={{ estado: 'enviada' }}
        onApply={() => {}}
      />,
    );

    // Esperar a que termine el initial load
    const trigger = await screen.findByText(/guardar filtro actual/i);
    fireEvent.click(trigger);

    const input = screen.getByPlaceholderText(/Nombre del filtro/i);
    fireEvent.change(input, { target: { value: 'Nuevo' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/mis-preferencias', {
        scope: 'admin.solicitudes',
        nombre: 'Nuevo',
        filtros: { estado: 'enviada' },
        predeterminado: false,
      });
    });
  });

  it('Escape cierra el input sin guardar', async () => {
    mockedGet.mockResolvedValue({ data: [] });

    render(<SavedFiltersBar scope="admin.solicitudes" currentFilters={{}} onApply={() => {}} />);

    const trigger = await screen.findByText(/guardar filtro actual/i);
    fireEvent.click(trigger);

    const input = screen.getByPlaceholderText(/Nombre del filtro/i);
    fireEvent.change(input, { target: { value: 'X' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByPlaceholderText(/Nombre del filtro/i)).not.toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
