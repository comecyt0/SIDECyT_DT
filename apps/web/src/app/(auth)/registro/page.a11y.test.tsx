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

  /** E76: nombre por partes, fecha y CURP; el resto de los datos del paso. */
  function llenarPersona(curp: string, fecha: string) {
    const { container } = render(<RegistroPage />);
    fireEvent.click(screen.getByRole('radio', { name: /Club De Robótica/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText(/^Nombre\(s\) \*/), { target: { value: 'GLORIA' } });
    fireEvent.change(screen.getByLabelText(/^Primer apellido \*/), { target: { value: 'hernández' } });
    fireEvent.change(screen.getByLabelText(/^Segundo apellido \*/), { target: { value: 'García' } });
    fireEvent.change(screen.getByLabelText(/^Fecha de nacimiento \*/), { target: { value: fecha } });
    fireEvent.change(screen.getByLabelText(/^CURP \*/), { target: { value: curp } });
    fireEvent.change(screen.getByLabelText(/^Correo electrónico \*/), { target: { value: 'gloria@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Teléfono \(10 dígitos\) \*/), { target: { value: '7221234567' } });
    fireEvent.change(screen.getByLabelText(/^Cargo u ocupación \*/), { target: { value: 'Docente' } });
    return container;
  }

  it('valida la CURP antes de avanzar (primera capa)', async () => {
    llenarPersona('XXXX', '1956-04-27');
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText(/La CURP debe tener 18 caracteres \(llevas 4\)/)).toBeInTheDocument();
  });

  it('E76: la CURP debe corresponder al nombre y la fecha; si no, se corrige o se manda a revisión', async () => {
    llenarPersona('hegg560427mvzrrl04', '1956-04-28');
    expect(screen.getByText('Tu CURP no coincide con tus datos')).toBeInTheDocument();
    expect(screen.getByText(/La fecha de la CURP \(27\/04\/1956\) no es tu fecha de nacimiento/)).toBeInTheDocument();
    expect(screen.getByText('Mujer')).toBeInTheDocument(); // sexo y estado salen de la CURP
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText(/envíala a revisión/)).toBeInTheDocument();
    // Con la fecha correcta coincide y avanza
    fireEvent.change(screen.getByLabelText(/^Fecha de nacimiento \*/), { target: { value: '1956-04-27' } });
    expect(screen.getByText('Tu CURP coincide con tu nombre y tu fecha de nacimiento.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByLabelText(/^Código postal \*/)).toBeInTheDocument();
  });

  it('E76: el paso de datos no tiene violaciones axe', async () => {
    const container = llenarPersona('hegg560427mvzrrl04', '1956-04-28');
    expect(await axe(container)).toHaveNoViolations();
  });
});
