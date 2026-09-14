import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import MonthlySeriesChart from './MonthlySeriesChart';

// jsdom no tiene tamaño real; reemplazamos ResponsiveContainer por un div con dimensiones
// fijas para que recharts pueda renderizar las series.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

describe('MonthlySeriesChart', () => {
  const data = [
    { label: 'Ene', enviadas: 5, aprobadas: 2 },
    { label: 'Feb', enviadas: 8, aprobadas: 4 },
    { label: 'Mar', enviadas: 6, aprobadas: 3 },
  ];
  const bars = [
    { key: 'enviadas', name: 'Enviadas', color: '#6B1F3A' },
    { key: 'aprobadas', name: 'Aprobadas', color: '#8A2049' },
  ];

  it('renderiza sin lanzar y mantiene el contenedor responsive', () => {
    const { getByTestId, container } = render(<MonthlySeriesChart data={data} bars={bars} />);

    expect(getByTestId('responsive-container')).toBeInTheDocument();
    // recharts inyecta un wrapper .recharts-wrapper o un <svg> dentro del container
    expect(container.querySelector('.recharts-wrapper, svg')).toBeTruthy();
  });

  it('acepta el flag stacked sin romper', () => {
    const { getByTestId } = render(<MonthlySeriesChart data={data} bars={bars} stacked />);
    expect(getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renderiza con data vacía sin lanzar', () => {
    const { getByTestId } = render(<MonthlySeriesChart data={[]} bars={bars} />);
    expect(getByTestId('responsive-container')).toBeInTheDocument();
  });
});
