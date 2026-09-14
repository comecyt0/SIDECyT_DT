import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSavedFilters } from './useSavedFilters';

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

describe('useSavedFilters', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedDelete.mockReset();
  });

  it('hace fetch inicial al endpoint /mis-preferencias con el scope correcto', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 1, scope: 'admin.solicitudes', nombre: 'F1', filtros: { estado: 'enviada' }, predeterminado: false },
        { id: 2, scope: 'admin.solicitudes', nombre: 'F2', filtros: { estado: 'aprobada' }, predeterminado: true },
      ],
    });

    const { result } = renderHook(() => useSavedFilters('admin.solicitudes'));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });
    expect(mockedGet).toHaveBeenCalledWith('/mis-preferencias', { params: { scope: 'admin.solicitudes' } });
    expect(result.current.loading).toBe(false);
  });

  it('save() hace POST y refresca la lista', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [{ id: 5, scope: 'revisor.bandeja', nombre: 'Nuevo', filtros: { x: 1 }, predeterminado: false }],
      });
    mockedPost.mockResolvedValue({
      data: { id: 5, scope: 'revisor.bandeja', nombre: 'Nuevo', filtros: { x: 1 }, predeterminado: false },
    });

    const { result } = renderHook(() => useSavedFilters('revisor.bandeja'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save('Nuevo', { x: 1 });
    });

    expect(mockedPost).toHaveBeenCalledWith('/mis-preferencias', {
      scope: 'revisor.bandeja',
      nombre: 'Nuevo',
      filtros: { x: 1 },
      predeterminado: false,
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
  });

  it('remove() hace DELETE y filtra el item localmente', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 1, scope: 's', nombre: 'A', filtros: {}, predeterminado: false },
        { id: 2, scope: 's', nombre: 'B', filtros: {}, predeterminado: false },
      ],
    });
    mockedDelete.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useSavedFilters('s'));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.remove(1);
    });

    expect(mockedDelete).toHaveBeenCalledWith('/mis-preferencias/1');
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe(2);
  });

  it('predeterminado devuelve el item marcado como predeterminado', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 1, scope: 's', nombre: 'A', filtros: {}, predeterminado: false },
        { id: 2, scope: 's', nombre: 'B', filtros: {}, predeterminado: true },
      ],
    });

    const { result } = renderHook(() => useSavedFilters('s'));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(result.current.predeterminado?.id).toBe(2);
  });

  it('predeterminado devuelve null cuando ningún item lo es', async () => {
    mockedGet.mockResolvedValue({
      data: [{ id: 1, scope: 's', nombre: 'A', filtros: {}, predeterminado: false }],
    });

    const { result } = renderHook(() => useSavedFilters('s'));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(result.current.predeterminado).toBeNull();
  });

  it('si el endpoint falla, items queda vacío y loading=false', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useSavedFilters('s'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
  });
});
