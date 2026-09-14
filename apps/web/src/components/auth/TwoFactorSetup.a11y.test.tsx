import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import TwoFactorSetup from './TwoFactorSetup';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { two_factor_enabled: false } }),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('TwoFactorSetup — accesibilidad', () => {
  it('no tiene violaciones axe en el estado inicial (2FA desactivado)', async () => {
    const { container } = render(<TwoFactorSetup />);

    // Esperar a que termine la carga inicial (api.get /auth/me) y se renderice el botón Activar.
    await waitFor(() => {
      expect(container.querySelector('button')).toBeTruthy();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
