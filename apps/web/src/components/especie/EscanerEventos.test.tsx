import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import EscanerEventos from './EscanerEventos';
import { leerFicha } from '@/lib/escaneo';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/lib/api', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const eventos = [{ id: 3, nombre: 'Convocatoria Clubes', eventos: [{ id: 11, nombre: 'Arranque', fecha: '2026-10-06', sede: 'Toluca' }] }];
const ficha = {
  club: { id: 7, folio: 'CLUB-2026-0007', nombre: 'Club Robótica', estado: 'aceptado', logo_url: null, escuela: { nombre: 'Sec. 5', municipio: 'Toluca', sistema: 'estatal' }, lider: { name: 'Ana' }, qr_habilitado: true },
  integrantes: [{ nombre: 'Ana', es_lider: true, foto_url: null }, { nombre: 'Luis', es_lider: false, foto_url: null }],
  sugerido_asistencia: 2, evento: eventos[0].eventos[0], asistencia: null, lunch: null, lunch_aprobado: 3,
  kit: { nombre: 'Kit', entregado_at: null, recibio: null, entrego: null, lugar: null }, ficha_completa: null,
};

describe('EscanerEventos (E52 · F4)', () => {
  beforeEach(() => {
    get.mockReset(); post.mockReset();
    try { localStorage.clear(); } catch { /* jsdom */ }
    get.mockImplementation(async (url: string) => {
      if (url === '/escaneo/eventos') return { data: eventos };
      if (url === '/escaneo/buscar') return { data: [{ id: 7, folio: 'CLUB-2026-0007', nombre: 'Club Robótica', escuela: 'Sec. 5', municipio: 'Toluca' }] };
      if (url === '/escaneo/clubes/7') return { data: ficha };
      throw new Error(url);
    });
  });

  it('sin convocatorias asignadas lo explica', async () => {
    get.mockImplementation(async (url: string) => (url === '/escaneo/eventos' ? { data: [] } : { data: null }));
    render(<EscanerEventos />);
    expect(await screen.findByText('No tienes eventos para escanear')).toBeInTheDocument();
  });

  it('busca a mano, confirma con la ficha y registra la asistencia con el método manual', async () => {
    post.mockResolvedValue({ data: { mensaje: 'Asistencia: 2 personas.', ficha: { ...ficha, asistencia: { cantidad: 2, metodo: 'manual', hora: null, quien: 'Operador' } } } });
    const { container } = render(<EscanerEventos />);
    await screen.findByRole('option', { name: /Arranque/ });
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.change(screen.getByLabelText('Buscar club'), { target: { value: 'robo' } });
    fireEvent.click(await screen.findByRole('button', { name: /Club Robótica/ }, { timeout: 2000 }));
    expect(await screen.findByRole('heading', { name: 'Club Robótica' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/escaneo/clubes/7', { params: { evento_id: 11 } });
    expect(screen.getByRole('spinbutton')).toHaveValue(2); // propone el número de integrantes
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/escaneo/registrar', { club_id: 7, tipo: 'asistencia', evento_id: 11, cantidad: 2, recibio: null, metodo: 'manual' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Asistencia: 2 personas.');
  });

  it('box lunch: no deja pasar de lo aprobado antes de llamar al servidor', async () => {
    render(<EscanerEventos />);
    await screen.findByRole('option', { name: /Arranque/ });
    fireEvent.click(screen.getByRole('radio', { name: /Box lunch/ }));
    fireEvent.change(screen.getByLabelText('Buscar club'), { target: { value: 'robo' } });
    fireEvent.click(await screen.findByRole('button', { name: /Club Robótica/ }, { timeout: 2000 }));
    const cant = await screen.findByRole('spinbutton');
    expect(cant).toHaveValue(3); // propone lo aprobado
    fireEvent.change(cant, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El máximo aprobado para este club es 3.');
    expect(post).not.toHaveBeenCalled();
  });

  it('kit: exige quién recibe; con registro previo ofrece corregir', async () => {
    get.mockImplementation(async (url: string) => {
      if (url === '/escaneo/eventos') return { data: eventos };
      if (url === '/escaneo/buscar') return { data: [{ id: 7, folio: 'CLUB-2026-0007', nombre: 'Club Robótica', escuela: null, municipio: null }] };
      return { data: { ...ficha, asistencia: { cantidad: 4, metodo: 'qr', hora: null, quien: 'Operador' } } };
    });
    render(<EscanerEventos />);
    await screen.findByRole('option', { name: /Arranque/ });
    fireEvent.change(screen.getByLabelText('Buscar club'), { target: { value: 'robo' } });
    fireEvent.click(await screen.findByRole('button', { name: /Club Robótica/ }, { timeout: 2000 }));
    expect(await screen.findByRole('button', { name: 'Corregir registro' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Kit/ }));
    const zona = screen.getByRole('button', { name: 'Registrar entrega' }).closest('div')!.parentElement!;
    fireEvent.click(within(zona).getByRole('button', { name: 'Registrar entrega' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe quién recibe el kit.');
    expect(post).not.toHaveBeenCalled();
  });

  it('la ficha solo acepta imágenes y enlaces internos (nunca URLs arbitrarias)', () => {
    const f = leerFicha({ ...ficha, club: { ...ficha.club, logo_url: 'https://malo.example/x.png' }, integrantes: [{ nombre: '<b>x</b>', foto_url: 'javascript:alert(1)' }], ficha_completa: 'https://malo.example' });
    expect(f?.club.logo_url).toBeNull();
    expect(f?.integrantes[0].foto_url).toBeNull();
    expect(f?.integrantes[0].nombre).toBe('<b>x</b>'); // se pinta como texto (React escapa)
    expect(f?.ficha_completa).toBeNull();
    expect(leerFicha({ club: { id: 'x' } })).toBeNull();
  });
});
