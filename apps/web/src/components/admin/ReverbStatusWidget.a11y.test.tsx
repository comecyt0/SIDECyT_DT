import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import ReverbStatusWidget from './ReverbStatusWidget';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        configured: true,
        host: '127.0.0.1',
        port: 8080,
        scheme: 'http',
        reachable: true,
        latency_ms: 42,
        error: null,
        broadcast_driver: 'reverb',
        hint: '',
      },
    }),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('ReverbStatusWidget — accesibilidad', () => {
  // El dot de estado ahora usa role="status" + aria-live + sr-only text en lugar de
  // aria-label en span sin role. Pasa axe.
  it('no tiene violaciones axe después de cargar el estado', async () => {
    const { container } = render(<ReverbStatusWidget />);

    await waitFor(() => {
      expect(container.textContent ?? '').toMatch(/Daemon/);
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
