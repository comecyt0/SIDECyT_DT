import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import Landing from './Landing';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
vi.mock('@/components/ui/GlobalLoader', () => ({
  useGlobalLoader: () => ({ isLoading: false, setIsLoading: vi.fn(), message: undefined, setMessage: vi.fn() }),
}));

// jsdom no implementa matchMedia ni IntersectionObserver (los usan Framer y el collage).
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }),
});
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IO });
Object.defineProperty(globalThis, 'IntersectionObserver', { writable: true, value: IO });

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const respond = (body: unknown, ok = true) =>
  fetchMock.mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body });

beforeEach(() => {
  fetchMock.mockReset();
  respond({ abiertas: [], proximas: [], cerradas: [] });
});

const conv = (o: Record<string, unknown>) => ({
  programa: 'Programa de Prototipos', descripcion: null, ejercicio_fiscal: '2027',
  fecha_apertura: '2027-01-10', fecha_cierre: '2099-12-31', fecha_prorroga: null, fecha_limite: '2099-12-31',
  banner_url: null, estado: 'abierta', ...o,
});

describe('Landing /sigae', () => {
  it('no tiene violaciones axe', async () => {
    const { container } = render(<Landing />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('valida el correo antes de ir al login y lo manda prellenado', () => {
    render(<Landing />);
    const input = screen.getByLabelText('Correo institucional');
    const submit = screen.getByRole('button', { name: 'Continuar al inicio de sesión' });

    fireEvent.change(input, { target: { value: 'sin-arroba' } });
    fireEvent.click(submit);
    expect(screen.getByRole('alert').textContent).toMatch(/correo válido/);
    expect(push).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'persona@institucion.edu.mx' } });
    fireEvent.click(submit);
    expect(push).toHaveBeenCalledWith('/login?email=persona%40institucion.edu.mx');
  });

  it('pinta las convocatorias abiertas, descarta registros inválidos y no ejecuta HTML', async () => {
    respond({
      abiertas: [
        conv({ nombre: 'Convocatoria PROT 2027', descripcion: '<img src=x onerror=alert(1)>' }),
        { nombre: 'Sin fechas', estado: 'abierta' },
        conv({ nombre: 'Estado inventado', estado: 'hackeado' }),
        conv({ nombre: '<script>alert(1)</script>', programa: null }),
      ],
      proximas: [],
      cerradas: [],
    });
    const { container } = render(<Landing />);
    expect(await screen.findByText('Convocatoria PROT 2027')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/convocatorias/publicas', expect.objectContaining({ credentials: 'omit' }));
    expect(screen.queryByText('Sin fechas')).toBeNull();
    expect(screen.queryByText('Estado inventado')).toBeNull();
    // El HTML de los datos llega como texto plano: ningún <script> ni <img> inyectado en el DOM.
    expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
    expect(container.querySelector('#convocatorias script, #convocatorias img')).toBeNull();
    expect(screen.getByText('2 convocatorias abiertas')).toBeTruthy();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('agrupa por estado en pestañas y solo pinta banners seguros', async () => {
    respond({
      abiertas: [conv({ nombre: 'Con prórroga', estado: 'prorroga', fecha_prorroga: '2099-12-31', fecha_cierre: '2099-06-30',
        banner_url: '/storage/banners/convocatorias/abc123.png' })],
      proximas: [conv({ nombre: 'Por abrir', estado: 'proxima', fecha_apertura: '2099-01-10', banner_url: 'https://evil.example/x.png' })],
      cerradas: [conv({ nombre: 'Ya cerró', estado: 'cerrada', fecha_cierre: '2026-01-10', fecha_limite: '2026-01-10',
        banner_url: 'javascript:alert(1)' })],
    });
    const { container } = render(<Landing />);
    expect(await screen.findByText('Con prórroga', { selector: 'h3' })).toBeTruthy();
    expect(screen.getByText('Prórroga hasta')).toBeTruthy();
    expect(container.querySelector('#convocatorias img')?.getAttribute('src')).toBe('/storage/banners/convocatorias/abc123.png');

    fireEvent.click(screen.getByRole('tab', { name: /Próximas a abrir/ }));
    expect(screen.getByText('Por abrir')).toBeTruthy();
    // Dominio no autorizado → sin imagen.
    expect(container.querySelector('#convocatorias img')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Cerradas/ }));
    expect(screen.getByText('Ya cerró')).toBeTruthy();
    expect(container.querySelector('#convocatorias img')).toBeNull();
    expect(container.querySelector('#convocatorias a[href="/login"]')).toBeNull(); // cerrada: sin «Postular»
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('muestra un mensaje claro si no hay convocatorias o si falla la API', async () => {
    const { unmount } = render(<Landing />);
    expect(await screen.findByText('Por ahora no hay convocatorias publicadas')).toBeTruthy();
    unmount();
    respond({}, false);
    render(<Landing />);
    expect(await screen.findByText('No pudimos cargar las convocatorias')).toBeTruthy();
  });

  it('enlaza al login y al registro general (E52)', () => {
    const { container } = render(<Landing />);
    expect(container.querySelector('a[href="/login"]')).toBeTruthy();
    expect(container.querySelector('a[href="/registro"]')).toBeTruthy();
    expect(container.querySelector('a[href="/solicitar-acceso"]')).toBeNull();
  });
});
