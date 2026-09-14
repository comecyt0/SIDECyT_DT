import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import { AlertBox } from './alert-box';

describe('AlertBox — accesibilidad', () => {
  it('no tiene violaciones axe en variante error con título', async () => {
    const { container } = render(
      <AlertBox type="error" title="Error grave" message="No se pudo guardar el formulario." />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('no tiene violaciones axe en variante success sin título y con detalles', async () => {
    const { container } = render(
      <AlertBox
        type="success"
        message="Operación realizada"
        details={['Se guardaron los cambios', 'Se envió el correo']}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('no tiene violaciones axe en variante warning no descartable', async () => {
    const { container } = render(
      <AlertBox type="warning" message="Revisa los datos antes de continuar." dismissible={false} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('no tiene violaciones axe en variante info', async () => {
    const { container } = render(
      <AlertBox type="info" message="Tu sesión expira en 5 minutos." />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
