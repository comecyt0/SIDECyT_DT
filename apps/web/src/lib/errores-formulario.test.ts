import { describe, it, expect } from 'vitest';
import { erroresFormulario, mensajeError } from './errores-formulario';

const r422 = (errors: Record<string, string[]>, message = 'The given data was invalid.') => ({ response: { status: 422, data: { message, errors } } });

describe('errores de formulario (reporte: "Crear usuario" no decía qué corregir)', () => {
  it('traduce cada error del servidor con el nombre visible del campo y el paso donde se corrige', () => {
    const r = erroresFormulario(
      r422({ password: ['Debe tener al menos 10 caracteres.'], 'periodo_ids.0': ['La opción elegida no existe.'] }),
      { password: 'Contraseña', periodo_ids: 'Periodos visibles' },
      { password: 'cuenta', periodo_ids: 'alcance' },
    );
    expect(r.titulo).toBe('Hay 2 datos por corregir.');
    expect(r.lineas).toEqual(['Contraseña: Debe tener al menos 10 caracteres.', 'Periodos visibles: La opción elegida no existe.']);
    expect(r.paso).toBe('cuenta');
    expect(r.campos.periodo_ids).toBe('La opción elegida no existe.');
  });

  it('sin conexión, 429 y 500 dan un aviso entendible (nunca "Validation failed" ni vacío)', () => {
    expect(erroresFormulario(new Error('Network Error')).titulo).toMatch(/conexión/);
    expect(erroresFormulario({ response: { status: 429, data: {} } }).titulo).toMatch(/Demasiados intentos/);
    const e500 = erroresFormulario({ response: { status: 500, data: { message: 'Server Error' } } });
    expect(e500.titulo).toBe('No se pudo guardar.');
    expect(e500.lineas[0]).toMatch(/servidor/);
  });

  it('acepta respuestas antiguas con `error` en vez de `message`', () => {
    expect(erroresFormulario({ response: { status: 422, data: { error: 'Solo con la solicitud aprobada.' } } }).titulo).toBe('Solo con la solicitud aprobada.');
  });

  it('mensajeError: una línea con lo que hay que corregir, o el texto por defecto', () => {
    expect(mensajeError(r422({ new_password: ['La contraseña debe incluir al menos un número.'] }), 'x')).toBe('La contraseña debe incluir al menos un número.');
    expect(mensajeError({ response: { status: 500, data: {} } }, 'No se pudo.')).toBe('No se pudo.');
    expect(mensajeError({ response: { status: 422, data: { message: 'Esta convocatoria tiene prórroga.' } } }, 'x')).toBe('Esta convocatoria tiene prórroga.');
  });
});
