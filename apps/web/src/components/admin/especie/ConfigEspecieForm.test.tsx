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
    expect(screen.getAllByText('Siempre obligatorio')).toHaveLength(3); // nombre del club, escuela, nombre del integrante
  });

  it('E79: los formatos se configuran; la carta de la escuela sigue obligatoria por defecto', () => {
    let ultimo: ConfigEspecie | null = null;
    render(<Envoltura onCambio={(c) => { ultimo = c; }} />);
    const carta = screen.getByRole('radiogroup', { name: 'Carta de consentimiento de la escuela' });
    expect(within(carta).getByLabelText('Obligatorio')).toBeChecked();
    const imagen = screen.getByRole('radiogroup', { name: 'Permiso de uso de imagen (uno por integrante)' });
    expect(within(imagen).getByLabelText('No pedir')).toBeChecked();
    fireEvent.click(within(imagen).getByLabelText('Obligatorio'));
    expect(ultimo!.formatos.uso_imagen).toEqual({ pedir: true, obligatorio: true });
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
