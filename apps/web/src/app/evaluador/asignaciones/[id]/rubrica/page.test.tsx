import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '42' }),
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import api from '@/lib/api';
import RubricaEvaluacionPage from './page';

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedPut = vi.mocked(api.put);

/** Mock asignación con convocatoria sin tipo_programa para que use ruta legacy (4 criterios) */
function mockAsignacionLegacy() {
  mockedGet.mockImplementation((url: string) => {
    if (url === '/evaluador/asignaciones/42') {
      return Promise.resolve({
        data: {
          id: 42,
          estado: 'evaluando',
          solicitud: {
            id: 7,
            folio: 'SOL-2026-007',
            titulo_proyecto: 'Proyecto Test',
            modalidad: 'A',
            empresa: { nombre: 'UAEMex' },
            convocatoria: {}, // sin tipo_programa → cae a legacy
          },
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  mockedPut.mockResolvedValue({ data: {} });
  mockedPost.mockResolvedValue({ data: { id: 1 } });
}

describe('RubricaEvaluacionPage', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
    pushMock.mockReset();
  });

  it('renderiza la rúbrica con datos de la asignación tras la carga', async () => {
    mockAsignacionLegacy();

    render(<RubricaEvaluacionPage />);

    await waitFor(() => {
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    });
    expect(screen.getByText('SOL-2026-007')).toBeInTheDocument();
    expect(screen.getByText('UAEMex')).toBeInTheDocument();
    // Los 4 criterios legacy
    expect(screen.getByText('Relevancia Científica / Tecnológica')).toBeInTheDocument();
    expect(screen.getByText('Metodología')).toBeInTheDocument();
    expect(screen.getByText('Impacto Regional')).toBeInTheDocument();
    expect(screen.getByText('Viabilidad')).toBeInTheDocument();
  });

  it('sumar puntajes vía los sliders calcula correctamente el total', async () => {
    mockAsignacionLegacy();

    render(<RubricaEvaluacionPage />);
    await waitFor(() => {
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    });

    // 4 sliders legacy, todos con max=25
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(4);

    fireEvent.change(sliders[0], { target: { value: '20' } });
    fireEvent.change(sliders[1], { target: { value: '15' } });
    fireEvent.change(sliders[2], { target: { value: '25' } });
    fireEvent.change(sliders[3], { target: { value: '10' } });

    // Total esperado = 70 — el texto del botón actualiza "(70/100)"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Emitir Dictamen \(70\/100\)/i })).toBeInTheDocument();
    });
  });

  it('al enviar sin aceptar carta de imparcialidad muestra error y no llama POST', async () => {
    mockAsignacionLegacy();

    render(<RubricaEvaluacionPage />);
    await waitFor(() => expect(screen.getByText('Proyecto Test')).toBeInTheDocument());

    // Cargar puntajes para habilitar botón (botón se deshabilita sólo con total === 0)
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '25' } });
    fireEvent.change(sliders[1], { target: { value: '25' } });

    // Click Emitir SIN aceptar carta
    fireEvent.click(screen.getByRole('button', { name: /Emitir Dictamen/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Debes aceptar la Carta de Imparcialidad/i),
      ).toBeInTheDocument();
    });
    // No se llamó al endpoint
    expect(mockedPost).not.toHaveBeenCalledWith(
      expect.stringContaining('/dictamen'),
      expect.anything(),
    );
  });

  it('botón "Emitir Dictamen" está deshabilitado cuando total === 0', async () => {
    mockAsignacionLegacy();

    render(<RubricaEvaluacionPage />);
    await waitFor(() => expect(screen.getByText('Proyecto Test')).toBeInTheDocument());

    const submitBtn = screen.getByRole('button', { name: /Emitir Dictamen/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submit válido (puntajes + carta aceptada + confirm) llama POST /evaluador/asignaciones/{id}/dictamen', async () => {
    mockAsignacionLegacy();

    render(<RubricaEvaluacionPage />);
    await waitFor(() => expect(screen.getByText('Proyecto Test')).toBeInTheDocument());

    // Puntajes
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '25' } });
    fireEvent.change(sliders[1], { target: { value: '25' } });
    fireEvent.change(sliders[2], { target: { value: '20' } });
    fireEvent.change(sliders[3], { target: { value: '20' } });

    // Aceptar carta
    fireEvent.click(screen.getByRole('checkbox', { name: /Carta de Imparcialidad/i }));

    // Click emitir → abre ConfirmDialog
    fireEvent.click(screen.getByRole('button', { name: /Emitir Dictamen/i }));

    // Confirmar
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirmar/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        '/evaluador/asignaciones/42/dictamen',
        expect.objectContaining({
          criterio_1_puntaje: 25,
          criterio_2_puntaje: 25,
          criterio_3_puntaje: 20,
          criterio_4_puntaje: 20,
          carta_imparcialidad_aceptada: true,
        }),
      );
    });
  });
});
