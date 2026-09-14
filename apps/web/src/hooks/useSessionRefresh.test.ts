import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionRefresh } from './useSessionRefresh';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

describe('useSessionRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('llama /auth/me al montar y NO programa refresh sin expires_at', async () => {
    mockedGet.mockResolvedValue({ data: { user: { id: 1 } } });

    renderHook(() => useSessionRefresh());

    await vi.waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/auth/me');
    });

    // Avanzar 24h → no debe haber refresh
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('programa refresh ~5 min antes de la expiración', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresInOneHour = nowSec + 3600;

    mockedGet.mockResolvedValue({ data: { user: { id: 1 }, expires_at: expiresInOneHour } });
    mockedPost.mockResolvedValue({ data: { expires_at: nowSec + 7200 } });

    renderHook(() => useSessionRefresh());

    await vi.waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/auth/me');
    });

    // Avanzar 54 min: aún no debería refrescar (refresca a los 55 min)
    await vi.advanceTimersByTimeAsync(54 * 60 * 1000);
    expect(mockedPost).not.toHaveBeenCalled();

    // Avanzar 2 min más → cruza el threshold y dispara refresh
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    await vi.waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/auth/refresh');
    });
  });

  it('no programa nada cuando enabled=false', async () => {
    renderHook(() => useSessionRefresh(false));

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockedGet).not.toHaveBeenCalled();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('no falla si /auth/me retorna 401', async () => {
    mockedGet.mockRejectedValue(new Error('401'));

    const { unmount } = renderHook(() => useSessionRefresh());

    await vi.waitFor(() => {
      expect(mockedGet).toHaveBeenCalled();
    });
    expect(mockedPost).not.toHaveBeenCalled();
    unmount();
  });
});
