import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import MiClubPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '5' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string }) => <a href={href} {...resto}>{children}</a>,
}));

const get = vi.fn();
vi.mock('@/lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

const detalle = (estado: string, faltantes: string[]) => ({
  club: {
    id: 5, folio: 'CLUB-2026-ABC123', nombre: 'Club <b>Volcanes</b>', estado, logo_url: 'https://evil.example/x.png', datos: { descripcion: 'Robótica' },
    enviado_at: null, editable: estado === 'borrador',
    escuela: { id: 1, cct: '15EPR0001A', nombre: 'Primaria Uno', municipio: 'Toluca', nivel: 'primaria', sistema: 'estatal' },
  },
  integrantes: [{ id: 9, es_lider: true, nombre: 'Líder Uno', fecha_nacimiento: '1985-03-12', sexo: null, curp: null, grado_grupo: null, correo: 'l@x.mx', telefono: null, datos: {}, foto_url: null, menor_de_edad: false }],
  documentos: [{ clave: 'carta_escuela', nombre: 'Carta de consentimiento de la escuela', obligatorio: true, formatos: ['pdf', 'imagen'], max_mb: 10, subido: null }],
  config: {
    min_integrantes: 3, max_integrantes: 5, participan_menores: true, kit_nombre: 'Kit de robótica', kit_descripcion: null,
    campos_club: { logo: { pedir: true, obligatorio: false }, descripcion: { pedir: true, obligatorio: false } },
    campos_integrante: { foto: { pedir: true, obligatorio: true }, fecha_nacimiento: { pedir: true, obligatorio: true } },
    campos: [],
  },
  convocatoria: { id: 2, nombre: 'Clubes 2026', acepta: true, fecha_limite: '2026-10-30' },
  faltantes,
});

describe('Mi club (E52 · F1)', () => {
  beforeEach(() => get.mockReset());

  it('en captura: muestra lo que falta, bloquea el envío y es accesible', async () => {
    get.mockResolvedValue({ data: detalle('borrador', ['El club necesita al menos 3 integrantes (tiene 1, incluido el líder).']) });
    const { container } = render(<MiClubPage />);
    await waitFor(() => expect(screen.getByText(/necesita al menos 3 integrantes/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Enviar a revisión/ })).toBeDisabled();
    expect(screen.getByText('1 de 5 · se necesitan al menos 3 (tú cuentas como integrante)')).toBeInTheDocument();
    // El nombre con HTML sale como texto y una URL de imagen ajena no se pinta.
    expect(screen.getByDisplayValue('Club <b>Volcanes</b>')).toBeInTheDocument();
    expect(container.querySelector('img[src*="evil.example"]')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('enviado: vista de solo lectura sin controles de edición', async () => {
    get.mockResolvedValue({ data: detalle('enviado', []) });
    render(<MiClubPage />);
    await waitFor(() => expect(screen.getByText(/está revisando tu club/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Guardar datos/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Agregar integrante/ })).toBeNull();
  });

  it('si el club no es suyo (404) no muestra datos', async () => {
    // Solo la petición real del club falla (el entorno de pruebas hace una llamada extra sin URL).
    get.mockImplementation((url?: string) => (url === '/club/clubes/5'
      ? Promise.reject(Object.assign(new Error('404'), { response: { status: 404 } }))
      : Promise.resolve({ data: null })));
    render(<MiClubPage />);
    await waitFor(() => expect(screen.getByText(/No encontramos este club/)).toBeInTheDocument());
  });
});
