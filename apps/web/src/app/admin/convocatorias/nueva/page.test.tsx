import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import ConvocatoriasNuevaPage from './page';

describe('ConvocatoriasNuevaPage — Wizard 7 pasos', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('renderiza el paso 1 inicialmente con el título correcto', () => {
    render(<ConvocatoriasNuevaPage />);
    // El step indicator muestra "1" como activo (sin checkmark)
    expect(screen.getByText('Información de la Convocatoria')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de la Convocatoria/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha de Apertura/i)).toBeInTheDocument();
  });

  it('al hacer click en "Siguiente" con campos vacíos no avanza y muestra errores de validación', () => {
    render(<ConvocatoriasNuevaPage />);

    const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
    fireEvent.click(nextBtn);

    // Sigue en paso 1 — el título no cambia
    expect(screen.getByText('Información de la Convocatoria')).toBeInTheDocument();
    // Aparecen mensajes de error
    expect(screen.getAllByText(/requerid[oa]/i).length).toBeGreaterThan(0);
  });

  it('avanza al paso 2 al click en "Siguiente" con los campos del paso 1 llenos', () => {
    render(<ConvocatoriasNuevaPage />);

    fireEvent.change(screen.getByLabelText(/Nombre de la Convocatoria/i), {
      target: { value: 'Convocatoria Test 2026' },
    });
    fireEvent.change(screen.getByLabelText(/Ejercicio Fiscal/i), {
      target: { value: '2026' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha de Apertura/i), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText(/Fecha de Cierre/i), {
      target: { value: '2026-12-31' },
    });
    fireEvent.change(screen.getByLabelText(/Monto Máximo de Apoyo/i), {
      target: { value: '100000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Ya cambió al paso 2
    expect(screen.getByText('Configuración del Programa')).toBeInTheDocument();
  });

  it('"Anterior" regresa del paso 2 al paso 1', () => {
    render(<ConvocatoriasNuevaPage />);

    // Llenar paso 1 y avanzar
    fireEvent.change(screen.getByLabelText(/Nombre de la Convocatoria/i), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByLabelText(/Ejercicio Fiscal/i), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Apertura/i), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Cierre/i), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText(/Monto Máximo de Apoyo/i), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Estamos en paso 2
    expect(screen.getByText('Configuración del Programa')).toBeInTheDocument();

    // Click "Anterior"
    fireEvent.click(screen.getByRole('button', { name: /Anterior/i }));
    expect(screen.getByText('Información de la Convocatoria')).toBeInTheDocument();
  });

  it('valida que fecha_apertura no puede ser posterior a fecha_cierre', () => {
    render(<ConvocatoriasNuevaPage />);

    fireEvent.change(screen.getByLabelText(/Nombre de la Convocatoria/i), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByLabelText(/Ejercicio Fiscal/i), { target: { value: '2026' } });
    // Apertura DESPUÉS de cierre — inválido
    fireEvent.change(screen.getByLabelText(/Fecha de Apertura/i), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Cierre/i), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/Monto Máximo de Apoyo/i), { target: { value: '100000' } });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // No avanza — sigue en paso 1
    expect(screen.getByText('Información de la Convocatoria')).toBeInTheDocument();
    // Aparece el mensaje específico
    expect(screen.getByText(/Apertura no puede ser después de cierre/i)).toBeInTheDocument();
  });
});
