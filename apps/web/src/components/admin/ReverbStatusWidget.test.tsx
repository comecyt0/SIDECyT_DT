import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReverbStatusWidget from './ReverbStatusWidget';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn() },
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);

describe('ReverbStatusWidget', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra estado reachable con latencia', async () => {
    mockedGet.mockResolvedValue({
      data: {
        configured: true,
        host: '127.0.0.1',
        port: 8080,
        scheme: 'http',
        reachable: true,
        latency_ms: 42,
        error: null,
        broadcast_driver: 'reverb',
        hint: 'OK',
      },
    });

    render(<ReverbStatusWidget />);
    await waitFor(() => {
      expect(screen.getByText(/Funcionando con normalidad/i)).toBeInTheDocument();
    });
    // 14/09/2026: sin jerga a la vista — host y latencia solo dentro de "Información para soporte"
    expect(screen.queryByText('127.0.0.1:8080')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Información para soporte/i }));
    expect(screen.getByText(/42 ms/)).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1:8080')).toBeInTheDocument();
  });

  it('muestra estado no-reachable con hint de error', async () => {
    mockedGet.mockResolvedValue({
      data: {
        configured: true,
        host: '127.0.0.1',
        port: 8080,
        scheme: 'http',
        reachable: false,
        latency_ms: null,
        error: 'Connection refused',
        broadcast_driver: 'reverb',
        hint: 'Reverb no responde. Ejecutar reverb:start.',
      },
    });

    render(<ReverbStatusWidget />);
    await waitFor(() => {
      expect(screen.getByText(/Sin conexión en este momento/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Información para soporte/i }));
    expect(screen.getByText(/Connection refused/i)).toBeInTheDocument();
  });

  it('no rompe si el endpoint falla', async () => {
    mockedGet.mockRejectedValue(new Error('500'));
    render(<ReverbStatusWidget />);
    await waitFor(() => {
      expect(screen.getByText(/No se pudo comprobar/i)).toBeInTheDocument();
    });
  });
});
