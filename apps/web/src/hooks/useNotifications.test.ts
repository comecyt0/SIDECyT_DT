import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/echo', () => ({
  getEcho: vi.fn(() => null),
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hace un fetch inicial y cuenta correctamente las no leídas', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 1, asunto: 'Una', leida_at: null },
        { id: 2, asunto: 'Dos', leida_at: '2026-01-01' },
        { id: 3, asunto: 'Tres', leida_at: null },
      ],
    });

    const { result } = renderHook(() => useNotifications({ pollMs: 60_000 }));

    await waitFor(() => {
      expect(result.current.notifs).toHaveLength(3);
    });
    expect(result.current.count).toBe(2);
    expect(mockedGet).toHaveBeenCalledWith('/mis-notificaciones?all=true');
  });

  it('soporta respuestas paginadas con shape { data: [...] }', async () => {
    mockedGet.mockResolvedValue({
      data: { data: [{ id: 1, asunto: 'X', leida_at: null }] },
    });

    const { result } = renderHook(() => useNotifications({ pollMs: 60_000 }));

    await waitFor(() => {
      expect(result.current.count).toBe(1);
    });
  });

  it('respeta enabled=false y no llama al endpoint', async () => {
    renderHook(() => useNotifications({ enabled: false }));
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('limita la lista mostrada a las 5 más recientes', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, asunto: `n${i}` }));
    mockedGet.mockResolvedValue({ data: items });

    const { result } = renderHook(() => useNotifications({ pollMs: 60_000 }));

    await waitFor(() => {
      expect(result.current.notifs).toHaveLength(5);
    });
  });

  it('no rompe si el endpoint falla', async () => {
    mockedGet.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useNotifications({ pollMs: 60_000 }));

    await waitFor(() => {
      expect(result.current.notifs).toEqual([]);
      expect(result.current.count).toBe(0);
    });
  });

  it('markAsRead hace optimistic update y llama al endpoint correcto', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 1, asunto: 'Una', leida_at: null },
        { id: 2, asunto: 'Dos', leida_at: null },
      ],
    });
    mockedPost.mockResolvedValue({ data: {} });

    const { result } = renderHook(() =>
      useNotifications({ pollMs: 60_000, basePath: '/mis-notificaciones' })
    );

    await waitFor(() => {
      expect(result.current.count).toBe(2);
    });

    await result.current.markAsRead(1);

    expect(mockedPost).toHaveBeenCalledWith('/mis-notificaciones/1/leer');
    await waitFor(() => {
      expect(result.current.count).toBe(1);
    });
  });

  it('markAllAsRead pone count a 0 y llama al endpoint correcto', async () => {
    mockedGet.mockResolvedValue({
      data: [
        { id: 1, asunto: 'Una', leida_at: null },
        { id: 2, asunto: 'Dos', leida_at: null },
        { id: 3, asunto: 'Tres', leida_at: null },
      ],
    });
    mockedPost.mockResolvedValue({ data: {} });

    const { result } = renderHook(() =>
      useNotifications({ pollMs: 60_000, basePath: '/admin/notificaciones' })
    );

    await waitFor(() => {
      expect(result.current.count).toBe(3);
    });

    await result.current.markAllAsRead();

    expect(mockedPost).toHaveBeenCalledWith('/admin/notificaciones/leer-todas');
    await waitFor(() => {
      expect(result.current.count).toBe(0);
    });
  });
});
