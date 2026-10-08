import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import RegistroPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={typeof src === 'string' ? src : ''} />,
}));
vi.mock('@/lib/api', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn() } }));

// E52 · Fase 5 — registro general (reemplaza la prueba de "Solicitar acceso").
describe('RegistroPage', () => {
  it('no tiene violaciones axe en el paso de rol', async () => {
    const { container } = render(<RegistroPage />);
    await waitFor(() => expect(container.querySelector('form')).toBeTruthy());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ofrece los tres roles de autoservicio y exige elegir uno', async () => {
    render(<RegistroPage />);
    expect(screen.getByRole('radio', { name: /Convocatorias/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Club De Robótica/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Evaluador/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Administrador/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Elige cómo participarás.')).toBeInTheDocument();
  });

  it('valida la CURP antes de avanzar (primera capa)', async () => {
    render(<RegistroPage />);
    fireEvent.click(screen.getByRole('radio', { name: /Club De Robótica/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText(/^Nombre completo \*/), { target: { value: 'Ana Pérez López' } });
    fireEvent.change(screen.getByLabelText(/^Correo electrónico \*/), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Teléfono \(10 dígitos\) \*/), { target: { value: '7221234567' } });
    fireEvent.change(screen.getByLabelText(/^CURP \*/), { target: { value: 'XXXX' } });
    fireEvent.change(screen.getByLabelText(/^Cargo u ocupación \*/), { target: { value: 'Docente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText(/La CURP no tiene un formato válido/)).toBeInTheDocument();
  });
});
