import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TwoFactorSetup from './TwoFactorSetup';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from '@/lib/api';

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

describe('TwoFactorSetup', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  it('muestra estado inactivo con botón Activar cuando 2FA no está habilitado', async () => {
    mockedGet.mockResolvedValue({ data: { two_factor_enabled: false } });

    render(<TwoFactorSetup />);

    await waitFor(() => {
      expect(screen.getByText(/El 2FA está/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Activar 2FA/i })).toBeInTheDocument();
  });

  it('inicia setup: muestra QR y campo de código tras click', async () => {
    mockedGet.mockResolvedValue({ data: { two_factor_enabled: false } });
    mockedPost.mockResolvedValue({
      data: {
        secret: 'JBSWY3DPEHPK3PXP',
        qr_svg: '<svg data-testid="qr"></svg>',
        otp_uri: 'otpauth://totp/...',
      },
    });

    render(<TwoFactorSetup />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Activar 2FA/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Activar 2FA/i }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/auth/2fa/setup');
    });
    await waitFor(() => {
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    });
  });

  it('confirm con código válido muestra recovery codes', async () => {
    mockedGet.mockResolvedValue({ data: { two_factor_enabled: false } });
    mockedPost.mockImplementation((url: string) => {
      if (url === '/auth/2fa/setup') {
        return Promise.resolve({ data: { secret: 'SECRET', qr_svg: '<svg/>', otp_uri: '' } });
      }
      if (url === '/auth/2fa/confirm') {
        return Promise.resolve({ data: { message: 'OK', recovery_codes: ['code-1', 'code-2', 'code-3', 'code-4'] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<TwoFactorSetup />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Activar 2FA/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Activar 2FA/i }));

    await waitFor(() => expect(screen.getByPlaceholderText('123456')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y activar/i }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/auth/2fa/confirm', { code: '123456' });
    });
    await waitFor(() => {
      expect(screen.getByText('code-1')).toBeInTheDocument();
      expect(screen.getByText('code-4')).toBeInTheDocument();
    });
  });

  it('confirm muestra error si el backend rechaza el código', async () => {
    mockedGet.mockResolvedValue({ data: { two_factor_enabled: false } });
    mockedPost.mockImplementation((url: string) => {
      if (url === '/auth/2fa/setup') {
        return Promise.resolve({ data: { secret: 'SECRET', qr_svg: '<svg/>', otp_uri: '' } });
      }
      return Promise.reject({ response: { data: { error: 'Código inválido. Verifica la hora.' } } });
    });

    render(<TwoFactorSetup />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Activar 2FA/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Activar 2FA/i }));
    await waitFor(() => expect(screen.getByPlaceholderText('123456')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y activar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Código inválido. Verifica la hora/)).toBeInTheDocument();
    });
  });

  it('cuando 2FA ya está activo muestra opción de desactivar', async () => {
    mockedGet.mockResolvedValue({ data: { two_factor_enabled: true } });

    render(<TwoFactorSetup />);
    await waitFor(() => {
      // El texto aparece en label + botón; usamos getAllByText
      expect(screen.getAllByText(/Desactivar 2FA/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByPlaceholderText(/Contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Código \(6 dígitos\)/i)).toBeInTheDocument();
  });
});
