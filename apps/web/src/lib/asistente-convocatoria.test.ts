import { describe, expect, it } from 'vitest';
import {
  armarPayload, describirError, erroresDelServidor, pasoDeError, restaurarBorrador, tieneContenido, CLAVE_PROGRAMA_RE,
  type EstadoAsistente,
} from './asistente-convocatoria';

const vacio: EstadoAsistente = {
  convocatoria: { nombre: '', ejercicio_fiscal: '2026', periodo_id: '', estado: 'borrador', descripcion: '', fecha_apertura: '', fecha_cierre: '', monto_maximo_apoyo: 0, porcentaje_aportacion_minima: 20 },
  programa: { clave: '', nombre: '', tipo_apoyo: 'concurrente', monto_maximo: 50000, tiene_etapas: false, num_etapas: 1, tiene_equipo: false, min_miembros_equipo: 1, max_miembros_equipo: 5, requiere_evaluacion_tecnica: true, puntaje_minimo_aprobatorio: 80 },
  campos: [], documentos: [], rubros: [], criterios: [],
};

const lleno: EstadoAsistente = {
  ...vacio,
  convocatoria: { ...vacio.convocatoria, nombre: 'Jóvenes Emprendedores', periodo_id: '3' },
  campos: [{ nombre_campo: 'personas', etiqueta: '¿Cuántas personas?', tipo_campo: 'select', requerido: true, orden: 1, opciones_json: '1\n2' },
    { nombre_campo: 'rfc', etiqueta: 'RFC', tipo_campo: 'text', requerido: true, orden: 2, opciones_json: 'basura' }],
  criterios: [{ nombre: 'I. Aeronáutica. II. Agroindustria. III. Agrotecnología y muchos más sectores', descripcion: '', ponderacion: 100, puntaje_maximo: 100, orden: 1 }],
};

describe('asistente de convocatorias (E47)', () => {
  it('arma un solo envío: periodo numérico y opciones solo en preguntas de lista', () => {
    const p = armarPayload(lleno, 9);
    expect(p.borrador_id).toBe(9);
    expect(p.convocatoria.periodo_id).toBe(3);
    expect(p.campos[0]).toMatchObject({ opciones: '1\n2' });
    expect(p.campos[1]).toMatchObject({ opciones: null });
    expect(p.campos[0]).not.toHaveProperty('opciones_json');
  });

  it('cada error del servidor lleva al paso donde se corrige', () => {
    expect(pasoDeError('convocatoria.fecha_cierre')).toBe(1);
    expect(pasoDeError('programa.clave')).toBe(2);
    expect(pasoDeError('campos.1.opciones')).toBe(3);
    expect(pasoDeError('documentos.0.clave')).toBe(4);
    expect(pasoDeError('rubros')).toBe(5);
    expect(pasoDeError('criterios.0.nombre')).toBe(6);
    expect(pasoDeError('otra_cosa')).toBe(7);
  });

  it('describe el error con el elemento y su nombre (el caso real: criterio demasiado largo)', () => {
    expect(describirError('criterios.0.nombre', 'No debe pasar de 255 caracteres.', lleno))
      .toMatch(/^Criterio 1 «I\. Aeronáutica\. II\. Agroindustria\.[^»]*…» — nombre: No debe pasar de 255 caracteres\.$/);
    expect(describirError('programa.clave', 'Ya está en uso.', lleno)).toBe('Programa — clave corta: Ya está en uso.');
    expect(describirError('criterios', 'La suma debe ser 100.', lleno)).toBe('Criterios: La suma debe ser 100.');
  });

  it('ordena los errores por paso e indica el primero', () => {
    const r = erroresDelServidor({ 'criterios.0.nombre': ['Muy largo.'], 'convocatoria.nombre': ['Obligatorio.'] }, lleno);
    expect(r?.paso).toBe(1);
    expect(r?.lineas[0]).toMatch(/^Convocatoria/);
    expect(erroresDelServidor(null, lleno)).toBeNull();
    expect(erroresDelServidor('texto', lleno)).toBeNull();
  });

  it('restaura un borrador ignorando tipos raros y valores no permitidos', () => {
    const s = restaurarBorrador({ v: 1, state: {
      convocatoria: { nombre: 'Guardada', monto_maximo_apoyo: 'mucho', periodo_id: 7 },
      programa: { tipo_apoyo: '<script>', tiene_etapas: 'sí' },
      campos: [{ etiqueta: 'P', tipo_campo: 'file' }, 'basura', null],
      documentos: [{ nombre: 'Doc', formatos: ['pdf', 3, 'zip'] }],
      criterios: [{ nombre: 'C', ponderacion: 100 }],
      extra: 'ignorado',
    } }, vacio);
    expect(s.convocatoria.nombre).toBe('Guardada');
    expect(s.convocatoria.monto_maximo_apoyo).toBe(0);
    expect(s.convocatoria.periodo_id).toBe('');
    expect(s.programa.tipo_apoyo).toBe('concurrente');
    expect(s.programa.tiene_etapas).toBe(false);
    expect(s.campos).toHaveLength(1);
    expect(s.campos[0].tipo_campo).toBe('text');
    expect(s.documentos[0].formatos).toEqual(['pdf', 'zip']);
    expect(s.criterios[0]).toMatchObject({ nombre: 'C', ponderacion: 100, puntaje_maximo: 100 });
    expect(s).not.toHaveProperty('extra');
    expect(restaurarBorrador(null, vacio)).toEqual({ ...vacio, convocatoria: { ...vacio.convocatoria } });
  });

  it('solo guarda borrador cuando hay algo capturado', () => {
    expect(tieneContenido(vacio)).toBe(false);
    expect(tieneContenido(lleno)).toBe(true);
  });

  it('clave del programa: acepta la del usuario, rechaza espacios y signos', () => {
    expect(CLAVE_PROGRAMA_RE.test('EMPRENDEDORES/2026')).toBe(true);
    expect(CLAVE_PROGRAMA_RE.test('PROT-2026.1')).toBe(true);
    expect(CLAVE_PROGRAMA_RE.test('MI CLAVE')).toBe(false);
    expect(CLAVE_PROGRAMA_RE.test('<b>')).toBe(false);
  });
});
