import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import UsuariosClient from './UsuariosClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/usuarios',
  useSearchParams: () => new URLSearchParams(),
}));

const post = vi.fn();
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn((url: string) => Promise.resolve({
      data: url === '/catalogos'
        ? { roles: [{ id: 2, nombre: 'Revisor Documental', slug: 'revisor' }, { id: 4, nombre: 'Solicitante', slug: 'solicitante' }], empresas: [] }
        : url === '/admin/periodos' ? [{ id: 1, nombre: '2026-1' }] : [],
    })),
    post: (...a: unknown[]) => post(...a),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const pagination = { current_page: 1, last_page: 1, per_page: 12, total: 0 };

/** E76: el nombre va por partes (se guarda con mayúscula inicial). */
function llenarNombre(dlg: HTMLElement) {
  fireEvent.change(within(dlg).getByLabelText(/^Nombre\(s\) \*/), { target: { value: 'ana' } });
  fireEvent.change(within(dlg).getByLabelText(/^Primer apellido \*/), { target: { value: 'PÉREZ' } });
}

async function llenarHastaAlcance() {
  render(<UsuariosClient users={[]} pagination={pagination} />);
  fireEvent.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
  const dlg = screen.getByRole('dialog');
  llenarNombre(dlg);
  fireEvent.change(within(dlg).getByLabelText(/^Correo electrónico \*/), { target: { value: 'ana@comecyt.mx' } });
  fireEvent.change(within(dlg).getByLabelText(/^Contraseña inicial \*/), { target: { value: 'corta' } });
  fireEvent.click(within(dlg).getByRole('button', { name: /Siguiente/ }));
  return dlg;
}

describe('Crear usuario (reporte 29/09/2026: 422 sin decir qué corregir)', () => {
  beforeEach(() => post.mockReset());

  it('la contraseña débil se detecta antes de enviar, con la regla real del servidor', async () => {
    const dlg = await llenarHastaAlcance();
    expect(within(dlg).getAllByText('La contraseña debe tener al menos 10 caracteres.').length).toBeGreaterThan(0);
    expect(within(dlg).getByText(/Mínimo 10 caracteres, con mayúsculas/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('15/10/2026: la confirmación debe coincidir y tiene su propio ojo', async () => {
    render(<UsuariosClient users={[]} pagination={pagination} />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
    const dlg = screen.getByRole('dialog');
    llenarNombre(dlg);
    fireEvent.change(within(dlg).getByLabelText(/^Correo electrónico \*/), { target: { value: 'ana@comecyt.mx' } });
    fireEvent.change(within(dlg).getByLabelText(/^Contraseña inicial \*/), { target: { value: 'Comecyt2026Seguro' } });
    const conf = within(dlg).getByLabelText(/^Confirmar contraseña \*/) as HTMLInputElement;
    fireEvent.change(conf, { target: { value: 'Comecyt2026Otro' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /Siguiente/ }));
    expect(within(dlg).getAllByText('Las contraseñas no coinciden.').length).toBeGreaterThan(0);
    expect(conf.type).toBe('password');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Mostrar confirmación' }));
    expect(conf.type).toBe('text');
    expect(post).not.toHaveBeenCalled();
  });

  it('un error del servidor se muestra DENTRO de la ventana y regresa al paso del campo', async () => {
    // Solo la petición real falla (el entorno de pruebas hace una llamada extra sin URL).
    post.mockImplementation((url?: string) => (url === '/admin/usuarios'
      ? Promise.reject({ response: { status: 422, data: { message: 'x', errors: { email: ['Ya existe una cuenta con este correo.'] } } } })
      : Promise.resolve({ data: null })));
    const dlg = await llenarHastaAlcance();
    fireEvent.change(within(dlg).getByLabelText(/^Contraseña inicial \*/), { target: { value: 'Comecyt2026Seguro' } });
    // 15/10/2026: la contraseña se confirma (con su propio ojo)
    fireEvent.change(within(dlg).getByLabelText(/^Confirmar contraseña \*/), { target: { value: 'Comecyt2026Seguro' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /Siguiente/ }));
    await waitFor(() => expect(within(dlg).getByRole('option', { name: 'Revisor Documental' })).toBeInTheDocument());
    fireEvent.change(within(dlg).getByLabelText(/^Papel en el sistema \*/), { target: { value: '2' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /Siguiente/ }));
    // Paso 3 (Alcance), como en el reporte.
    expect(within(dlg).getByText('¿Qué periodos puede ver?')).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Crear usuario' }));
    await waitFor(() => expect(within(dlg).getByRole('alert')).toHaveTextContent('Correo electrónico: Ya existe una cuenta con este correo.'));
    // Regresó al paso 1 y el campo está marcado.
    expect(within(dlg).getByLabelText(/^Correo electrónico \*/)).toHaveAttribute('aria-invalid', 'true');
    expect(within(dlg).getByRole('alert')).toHaveTextContent('No se guardó');

    // Corregir y seguir: el marco deja avanzar (antes regresaba al paso 1 en cada render) y el aviso viejo se oculta.
    post.mockImplementation(() => Promise.resolve({ data: { message: 'ok' } }));
    fireEvent.change(within(dlg).getByLabelText(/^Correo electrónico \*/), { target: { value: 'ana.nueva@comecyt.mx' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /Siguiente/ }));
    expect(within(dlg).getByLabelText(/^Papel en el sistema \*/)).toBeInTheDocument();
    expect(within(dlg).queryByRole('alert')).toBeNull();
    fireEvent.click(within(dlg).getByRole('button', { name: /Siguiente/ }));
    fireEvent.click(within(dlg).getByRole('button', { name: 'Crear usuario' }));
    await waitFor(() => expect(screen.getByText(/Usuario Ana Pérez creado/)).toBeInTheDocument());
  });

  it('al crear, cierra la ventana y confirma con un aviso visible', async () => {
    post.mockResolvedValue({ data: { message: 'ok' } });
    const dlg = await llenarHastaAlcance();
    fireEvent.change(within(dlg).getByLabelText(/^Contraseña inicial \*/), { target: { value: 'Comecyt2026Seguro' } });
    // 15/10/2026: la contraseña se confirma (con su propio ojo)
    fireEvent.change(within(dlg).getByLabelText(/^Confirmar contraseña \*/), { target: { value: 'Comecyt2026Seguro' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /Siguiente/ }));
    await waitFor(() => expect(within(dlg).getByRole('option', { name: 'Solicitante' })).toBeInTheDocument());
    fireEvent.change(within(dlg).getByLabelText(/^Papel en el sistema \*/), { target: { value: '4' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Crear usuario' }));
    await waitFor(() => expect(screen.getByText(/Usuario Ana Pérez creado/)).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(post).toHaveBeenCalledWith('/admin/usuarios', expect.objectContaining({ nombres: 'Ana', primer_apellido: 'Pérez' }));
  });

  it('E76: una CURP que no coincide se detiene hasta que el admin la confirma', async () => {
    render(<UsuariosClient users={[]} pagination={pagination} />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText(/^Nombre\(s\) \*/), { target: { value: 'Gloria' } });
    fireEvent.change(within(dlg).getByLabelText(/^Primer apellido \*/), { target: { value: 'Hernández' } });
    fireEvent.change(within(dlg).getByLabelText(/^Segundo apellido/), { target: { value: 'García' } });
    fireEvent.change(within(dlg).getByLabelText(/^CURP/), { target: { value: 'hegg560427mvzrrl04' } });
    fireEvent.change(within(dlg).getByLabelText(/^Fecha de nacimiento/), { target: { value: '1956-04-28' } });
    expect(within(dlg).getByText(/no es tu fecha de nacimiento/)).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('button', { name: /Siguiente/ }));
    expect(within(dlg).getAllByText(/La CURP no coincide/).length).toBeGreaterThan(0);
    fireEvent.change(within(dlg).getByLabelText(/^Fecha de nacimiento/), { target: { value: '1956-04-27' } });
    expect(within(dlg).getByText('La CURP coincide con el nombre y la fecha de nacimiento.')).toBeInTheDocument();
  });
});
