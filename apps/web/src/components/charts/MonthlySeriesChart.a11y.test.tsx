import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import MonthlySeriesChart from './MonthlySeriesChart';

describe('MonthlySeriesChart — accesibilidad', () => {
  it('no tiene violaciones axe en el wrapper del chart', async () => {
    const data = [
      { label: 'Ene', enviadas: 12, aprobadas: 8 },
      { label: 'Feb', enviadas: 18, aprobadas: 10 },
      { label: 'Mar', enviadas: 22, aprobadas: 14 },
    ];
    const bars = [
      { key: 'enviadas', name: 'Enviadas', color: '#6B1F3A' },
      { key: 'aprobadas', name: 'Aprobadas', color: '#C9A96E' },
    ];

    const { container } = render(<MonthlySeriesChart data={data} bars={bars} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
