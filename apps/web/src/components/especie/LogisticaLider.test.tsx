import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import LogisticaLider from './LogisticaLider';
import type { LogisticaEstado } from '@/lib/especie';

const post = vi.fn();
vi.mock('@/lib/api', () => ({ default: { post: (...a: unknown[]) => post(...a), get: vi.fn(), delete: vi.fn() } }));
const urlImagenQr = vi.fn(async () => 'blob:qr-prueba');
const descargarCredencial = vi.fn(async () => undefined);
vi.mock('@/lib/especie-api', () => ({
  urlImagenQr: (...a: unknown[]) => urlImagenQr(...(a as [])), descargarCredencial: (...a: unknown[]) => descargarCredencial(...(a as [])),
  descargarFirmado: vi.fn(), descargarFormatoLogistica: vi.fn(), descargarResguardo: vi.fn(),
}));

const base: LogisticaEstado = {
  aplica: true, estatal: true, modo: 'convocatoria', abierta: true, fecha_limite: '2026-10-15',
  limites: { transporte: 3, lunch: 4 }, tope_integrantes: true, acompanantes: 1, max_integrantes: 4, modalidad: 'nacional',
  apoyos: { incluye_transporte: true, incluye_lunch: true, transporte_salida_lugar: null, transporte_salida_hora: null, transporte_regreso_lugar: null, transporte_regreso_hora: null },
  solicitudes: [{ evento: null, solicitud: null, versiones: [], cupo: { transporte: { total: 10, usado: 2, disponible: 8 }, lunch: { total: null, usado: 0, disponible: null } } }],
  resguardo: [],
  kit: { nombre: 'Kit de robótica', fecha: null, lugar: null, asignado_at: null, entregado_at: null, entregado_lugar: null, entrego: null, recibio: null },
  salida: { lugar: null, maps: null, hora: null },
  qr: { habilitado: false, habilitado_at: null, falta: 'su carta de resguardo no está aprobada' },
};

describe('LogisticaLider (E52 · F3)', () => {
  beforeEach(() => {
    post.mockReset(); urlImagenQr.mockClear(); descargarCredencial.mockClear();
    URL.revokeObjectURL = vi.fn(); // jsdom no lo implementa
  });

  it('escuela federal: solo kit, sin transporte ni box lunch', async () => {
    const { container } = render(<LogisticaLider clubId={1} folio="CLUB-X" logistica={{ ...base, estatal: false }} onCambio={vi.fn()} onAviso={vi.fn()} />);
    expect(screen.getByText(/sistema federal/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar solicitud/ })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sin transporte pide la doble confirmación antes de enviar', async () => {
    post.mockResolvedValue({ data: base });
    render(<LogisticaLider clubId={1} folio="CLUB-X" logistica={base} onCambio={vi.fn()} onAviso={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Box lunch/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/ }));
    expect(screen.getByText('¿Estás seguro que no quieres transporte?')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, sin transporte' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/club/clubes/1/logistica', { evento_id: null, transporte: 0, lunch: 2, confirmo_sin_transporte: true }));
  });

  it('respeta el máximo por club antes de llamar al servidor y muestra el cupo que queda', () => {
    const onAviso = vi.fn();
    render(<LogisticaLider clubId={1} folio="CLUB-X" logistica={base} onCambio={vi.fn()} onAviso={onAviso} />);
    expect(screen.getByText('Quedan 8 lugares')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Personas con transporte/), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/ }));
    expect(onAviso).toHaveBeenCalledWith(false, 'El máximo de transporte para tu club es 3.');
    expect(post).not.toHaveBeenCalled();
  });

  it('F4: sin QR habilitado dice qué falta y no ofrece credencial', () => {
    render(<LogisticaLider clubId={1} folio="CLUB-X" logistica={base} onCambio={vi.fn()} onAviso={vi.fn()} />);
    expect(screen.getByText(/Por ahora: su carta de resguardo no está aprobada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar credencial/ })).toBeNull();
    expect(urlImagenQr).not.toHaveBeenCalled();
  });

  it('F4: con QR habilitado muestra la imagen (pedida con sesión) y la credencial', async () => {
    const { container } = render(<LogisticaLider clubId={1} folio="CLUB-X" logistica={{ ...base, qr: { habilitado: true, habilitado_at: '2026-09-29T18:00:00Z', falta: null } }} onCambio={vi.fn()} onAviso={vi.fn()} />);
    expect(await screen.findByRole('img', { name: /Código QR del club CLUB-X/ })).toHaveAttribute('src', 'blob:qr-prueba');
    expect(urlImagenQr).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: /Descargar credencial/ }));
    await waitFor(() => expect(descargarCredencial).toHaveBeenCalledWith(1, 'CLUB-X'));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('muestra la modalidad de la convocatoria y el tope de box lunch por integrantes', () => {
    render(<LogisticaLider clubId={1} folio="CLUB-X" logistica={base} onCambio={vi.fn()} onAviso={vi.fn()} />);
    expect(screen.getAllByText('Modalidad: Nacional').length).toBeGreaterThan(1);
    expect(screen.getByText(/no pasa del máximo de 4 integrantes de la convocatoria/)).toBeInTheDocument();
  });

  it('pasada la fecha límite no deja pedir ni cambiar', () => {
    render(<LogisticaLider clubId={1} folio="CLUB-X" logistica={{ ...base, abierta: false }} onCambio={vi.fn()} onAviso={vi.fn()} />);
    expect(screen.getByText(/La fecha límite fue/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar solicitud/ })).toBeNull();
    expect(screen.getByLabelText(/Personas con transporte/)).toBeDisabled();
  });
});
