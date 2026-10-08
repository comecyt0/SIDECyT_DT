import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import FechaHoraAmPm, { partesDe, valorDe, fechaHoraCompleta } from './fecha-hora-ampm';

describe('FechaHoraAmPm (E56)', () => {
  it('convierte entre 24 h y 12 h con a. m. / p. m.', () => {
    expect(valorDe('2026-10-15', '3', '30', 'PM')).toBe('2026-10-15T15:30');
    expect(valorDe('2026-10-15', '12', '00', 'AM')).toBe('2026-10-15T00:00');
    expect(valorDe('2026-10-15', '12', '05', 'PM')).toBe('2026-10-15T12:05');
    expect(partesDe('2026-10-15T00:10')).toMatchObject({ hora: '12', minuto: '10', ampm: 'AM' });
    expect(partesDe('2026-10-15T13:45')).toMatchObject({ fecha: '2026-10-15', hora: '1', minuto: '45', ampm: 'PM' });
    expect(fechaHoraCompleta('2026-10-15T')).toBe(false);
    expect(fechaHoraCompleta('2026-10-15T09:00')).toBe(true);
  });

  it('la fecha y la hora van separadas y se elige a. m. o p. m.', () => {
    const cambio = vi.fn();
    function Prueba() {
      const [v, setV] = useState('');
      return <FechaHoraAmPm value={v} onChange={(x) => { setV(x); cambio(x); }} />;
    }
    render(<Prueba />);
    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: '2026-10-15' } });
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '15' } });
    expect(cambio).toHaveBeenLastCalledWith('2026-10-15T04:15');
    fireEvent.click(screen.getByRole('radio', { name: 'p. m.' }));
    expect(cambio).toHaveBeenLastCalledWith('2026-10-15T16:15');
    expect(screen.getByRole('radio', { name: 'p. m.' })).toHaveAttribute('aria-checked', 'true');
  });
});
