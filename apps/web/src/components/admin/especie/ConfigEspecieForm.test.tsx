import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import ConfigEspecieForm from './ConfigEspecieForm';
import { configVacia, type ConfigEspecie } from '@/lib/especie';

function Envoltura({ onCambio }: { onCambio?: (c: ConfigEspecie) => void }) {
  const [c, setC] = useState<ConfigEspecie>(configVacia());
  return <ConfigEspecieForm value={c} onChange={(n) => { setC(n); onCambio?.(n); }} />;
}

describe('ConfigEspecieForm (E52 · F1)', () => {
  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = render(<Envoltura />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('los datos fijos se muestran como siempre obligatorios y no se pueden cambiar', () => {
    render(<Envoltura />);
    expect(screen.getAllByText('Siempre obligatorio')).toHaveLength(4); // nombre del club, escuela, carta, nombre del integrante
  });

  it('cambiar un dato a "Obligatorio" implica pedirlo', () => {
    let ultimo: ConfigEspecie | null = null;
    render(<Envoltura onCambio={(c) => { ultimo = c; }} />);
    const grupo = screen.getByRole('radiogroup', { name: 'CURP' });
    fireEvent.click(within(grupo).getByLabelText('Obligatorio'));
    expect(ultimo!.campos_integrante.curp).toEqual({ pedir: true, obligatorio: true });
    fireEvent.click(within(grupo).getByLabelText('No pedir'));
    expect(ultimo!.campos_integrante.curp).toEqual({ pedir: false, obligatorio: false });
  });

  it('el campo "clubes por escuela" vacío significa sin límite', () => {
    let ultimo: ConfigEspecie | null = null;
    render(<Envoltura onCambio={(c) => { ultimo = c; }} />);
    const input = screen.getByLabelText('Clubes por escuela');
    fireEvent.change(input, { target: { value: '2' } });
    expect(ultimo!.clubes_por_escuela).toBe(2);
    fireEvent.change(input, { target: { value: '' } });
    expect(ultimo!.clubes_por_escuela).toBe('');
  });
});
