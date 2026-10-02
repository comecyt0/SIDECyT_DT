import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { axe } from '@/test/axe-helper';
import SelectorPrograma, { type ValorPrograma } from './SelectorPrograma';
import type { ProgramaCatalogo } from '@/lib/asistente-convocatoria';

const catalogo: ProgramaCatalogo[] = [
  { id: 1, nombre: 'Programa para el Desarrollo de Prototipos', sistema: 'sigae', activo: true, convocatorias: 2 },
  { id: 31, nombre: 'STEAM EDOMEX PROGRAMA ESTATAL DE ROBÓTICA', sistema: 'sigae', activo: false, convocatorias: 1 },
  { id: 10, nombre: 'Beca de Educación Dual', sistema: 'sicei', activo: false, convocatorias: 0 },
];

function Prueba({ onChange, inicial }: { onChange: (v: ValorPrograma) => void; inicial?: Partial<ValorPrograma> }) {
  const [v, setV] = useState<ValorPrograma>({ id: null, nuevo: false, nombre: '', sistema: 'sigae', ...inicial });
  return <SelectorPrograma catalogo={catalogo} errorCarga={false} onReintentar={vi.fn()} valor={v} maxNombre={255}
    onChange={(x) => { setV(x); onChange(x); }} />;
}

describe('SelectorPrograma (E54)', () => {
  it('lista los programas por sistema, con oculto y número de convocatorias, y deja elegir uno', async () => {
    const onChange = vi.fn();
    const { container } = render(<Prueba onChange={onChange} />);
    expect(screen.getByText('SIGAE · Apoyo Empresarial')).toBeInTheDocument();
    expect(screen.getByText('SICEI · Ciencia, Educación e Innovación')).toBeInTheDocument();
    expect(screen.getByText('2 convocatorias')).toBeInTheDocument();
    expect(screen.getAllByText('Oculto')).toHaveLength(2);
    fireEvent.click(screen.getByRole('radio', { name: /STEAM EDOMEX/ }));
    expect(onChange).toHaveBeenLastCalledWith({ id: 31, nuevo: false, nombre: 'STEAM EDOMEX PROGRAMA ESTATAL DE ROBÓTICA', sistema: 'sigae' });
    expect(screen.getByRole('radio', { name: /STEAM EDOMEX/ })).toHaveAttribute('aria-checked', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('el buscador ignora acentos y mayúsculas', () => {
    render(<Prueba onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Programa *'), { target: { value: 'robotica' } });
    expect(screen.getByRole('radio', { name: /STEAM EDOMEX/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Prototipos/ })).toBeNull();
  });

  it('programa nuevo: avisa si el nombre ya existe en ese sistema y ofrece usar el existente', () => {
    const onChange = vi.fn();
    render(<Prueba onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /Programa nuevo/ }));
    expect(screen.getByText(/aparece en la página pública cuando completes su descripción/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nombre del programa *'), { target: { value: 'steam edomex programa estatal de robotica' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe «STEAM EDOMEX PROGRAMA ESTATAL DE ROBÓTICA» en SIGAE');
    fireEvent.click(screen.getByRole('button', { name: 'Usar el existente' }));
    expect(onChange).toHaveBeenLastCalledWith({ id: 31, nuevo: false, nombre: 'STEAM EDOMEX PROGRAMA ESTATAL DE ROBÓTICA', sistema: 'sigae' });
  });

  it('el mismo nombre en otro sistema no es duplicado', () => {
    render(<Prueba onChange={vi.fn()} inicial={{ nuevo: true, sistema: 'sicei' }} />);
    fireEvent.change(screen.getByLabelText('Nombre del programa *'), { target: { value: 'Programa para el Desarrollo de Prototipos' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
