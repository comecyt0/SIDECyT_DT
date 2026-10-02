import { describe, expect, it } from 'vitest';
import {
  armarPayload, describirError, erroresDelServidor, pasoDeError, restaurarBorrador, tieneContenido, CLAVE_PROGRAMA_RE,
  pasosDe, leerCatalogo, normalizarNombre, programaRepetido, type EstadoAsistente,
} from './asistente-convocatoria';
import { configVacia, leerConfig, validarConfig } from './especie';

const vacio: EstadoAsistente = {
  convocatoria: { nombre: '', ejercicio_fiscal: '2026', periodo_id: '', estado: 'borrador', descripcion: '', fecha_apertura: '', fecha_cierre: '', monto_maximo_apoyo: 0, porcentaje_aportacion_minima: 20 },
  programa: { clave: '', nombre: '', tipo_apoyo: 'concurrente', monto_maximo: 50000, tiene_etapas: false, num_etapas: 1, tiene_equipo: false, min_miembros_equipo: 1, max_miembros_equipo: 5, requiere_evaluacion_tecnica: true, puntaje_minimo_aprobatorio: 80, programa_publico_id: null, programa_nuevo: false, sistema: 'sigae' },
  campos: [], documentos: [], rubros: [], criterios: [],
  especie: configVacia(),
};

const lleno: EstadoAsistente = {
  ...vacio,
  convocatoria: { ...vacio.convocatoria, nombre: 'Jóvenes Emprendedores', periodo_id: '3' },
  campos: [{ nombre_campo: 'personas', etiqueta: '¿Cuántas personas?', tipo_campo: 'select', requerido: true, orden: 1, opciones_json: '1\n2' },
    { nombre_campo: 'rfc', etiqueta: 'RFC', tipo_campo: 'text', requerido: true, orden: 2, opciones_json: 'basura' }],
  criterios: [{ nombre: 'I. Aeronáutica. II. Agroindustria. III. Agrotecnología y muchos más sectores', descripcion: '', ponderacion: 100, puntaje_maximo: 100, orden: 1 }],
};

describe('programa ↔ convocatoria (E54)', () => {
  const catalogo = leerCatalogo([
    { id: 1, nombre: 'STEAM EDOMEX PROGRAMA ESTATAL DE ROBÓTICA', sistema: 'sigae', activo: false, convocatorias_count: 1 },
    { id: 2, nombre: 'Programa LEGO', sistema: 'sicei', activo: true, convocatorias_count: 0 },
    { id: 'x', nombre: 'inválido' }, { id: 3, nombre: 'Sin sistema', sistema: 'otro' },
  ]);

  it('lee el catálogo validando tipos y descarta lo inválido', () => {
    expect(catalogo).toEqual([
      { id: 1, nombre: 'STEAM EDOMEX PROGRAMA ESTATAL DE ROBÓTICA', sistema: 'sigae', activo: false, convocatorias: 1 },
      { id: 2, nombre: 'Programa LEGO', sistema: 'sicei', activo: true, convocatorias: 0 },
    ]);
    expect(leerCatalogo(null)).toEqual([]);
  });

  it('detecta un programa repetido ignorando mayúsculas, acentos y espacios, solo en el mismo sistema', () => {
    expect(programaRepetido(catalogo, 'sigae', '  steam edomex programa estatal de robotica ')?.id).toBe(1);
    expect(programaRepetido(catalogo, 'sicei', 'STEAM EDOMEX PROGRAMA ESTATAL DE ROBÓTICA')).toBeNull();
    expect(programaRepetido(catalogo, 'sicei', 'programa  lego')?.id).toBe(2);
    expect(normalizarNombre('ROBÓTICA  Ñandú')).toBe('robotica nandu');
  });

  it('el envío lleva el programa existente o el nuevo, nunca ambos', () => {
    const existente = armarPayload({ ...vacio, programa: { ...vacio.programa, programa_publico_id: 2, nombre: 'Programa LEGO' } }, null);
    expect(existente.programa).toMatchObject({ programa_publico_id: 2, programa_nuevo: false });
    const nuevo = armarPayload({ ...vacio, programa: { ...vacio.programa, programa_publico_id: 2, programa_nuevo: true, sistema: 'sicei', nombre: 'Robótica 2' } }, null);
    expect(nuevo.programa).toMatchObject({ programa_publico_id: null, programa_nuevo: true, sistema: 'sicei' });
  });

  it('el borrador recupera el programa elegido y descarta valores raros', () => {
    const r = restaurarBorrador({ state: { programa: { programa_publico_id: 7, programa_nuevo: false, sistema: 'sicei' } } }, vacio);
    expect(r.programa).toMatchObject({ programa_publico_id: 7, programa_nuevo: false, sistema: 'sicei' });
    const raro = restaurarBorrador({ state: { programa: { programa_publico_id: '7; DROP', sistema: 'x' } } }, vacio);
    expect(raro.programa).toMatchObject({ programa_publico_id: null, sistema: 'sigae' });
    expect(tieneContenido({ ...vacio, programa: { ...vacio.programa, programa_publico_id: 3 } })).toBe(true);
  });
});

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

describe('asistente · Apoyo en especie (E52)', () => {
  const especie: EstadoAsistente = {
    ...vacio,
    convocatoria: { ...vacio.convocatoria, nombre: 'Clubes de ciencia', monto_maximo_apoyo: 50000 },
    programa: { ...vacio.programa, clave: 'CLUB', nombre: 'Clubes', tipo_apoyo: 'especie' },
    rubros: [{ clave: 'X', nombre: 'no debe viajar', descripcion: '', porcentaje_maximo: 10 }],
    especie: {
      ...configVacia(), kit_nombre: 'Kit de robótica', clubes_por_escuela: '',
      campos: [{ ambito: 'integrante', nombre_campo: 'talla', etiqueta: 'Talla', tipo_campo: 'select', requerido: true, opciones: 'CH\nM' }],
    },
  };

  it('cinco pasos, con "Club y kit" y sin conceptos de gasto ni criterios', () => {
    expect(pasosDe(especie)).toEqual(['convocatoria', 'programa', 'especie', 'documentos', 'revision']);
    expect(pasosDe(vacio)).toHaveLength(7);
  });

  it('el envío no lleva dinero, conceptos ni criterios y sí la configuración y las preguntas con ámbito', () => {
    const p = armarPayload(especie, null) as Record<string, unknown> & { convocatoria: Record<string, unknown>; programa: Record<string, unknown>; campos: Record<string, unknown>[]; especie: Record<string, unknown> };
    expect(p.convocatoria.monto_maximo_apoyo).toBeNull();
    expect(p.programa.monto_maximo).toBeNull();
    expect(p).not.toHaveProperty('rubros');
    expect(p).not.toHaveProperty('criterios');
    expect(p.especie).toMatchObject({ kit_nombre: 'Kit de robótica', clubes_por_escuela: null, min_integrantes: 3 });
    expect(p.campos[0]).toMatchObject({ ambito: 'integrante', nombre_campo: 'talla', opciones: 'CH\nM', orden: 1 });
  });

  it('errores de especie llevan al paso "Club y kit"', () => {
    expect(pasoDeError('especie.kit_nombre', true)).toBe(3);
    expect(pasoDeError('campos.0.nombre_campo', true)).toBe(3);
    expect(pasoDeError('documentos.0.clave', true)).toBe(4);
    expect(describirError('especie.kit_nombre', 'Obligatorio.', especie)).toBe('Club y kit — nombre del kit: Obligatorio.');
    expect(describirError('campos.0.opciones', 'Falta.', especie)).toBe('Pregunta 1 «Talla» — opciones: Falta.');
  });

  it('el borrador conserva la modalidad y la configuración, sin confiar en tipos', () => {
    const s = restaurarBorrador({ state: { programa: { tipo_apoyo: 'especie' }, especie: { kit_nombre: 'K', min_integrantes: '9', clubes_por_escuela: -1, campos_club: { logo: { obligatorio: true }, hack: {} }, campos: [{ ambito: 'otro', tipo_campo: 'file', opciones_json: [{ id: 1, label: 'A' }] }] } } }, vacio);
    expect(s.programa.tipo_apoyo).toBe('especie');
    expect(s.especie.kit_nombre).toBe('K');
    expect(s.especie.min_integrantes).toBe(3);
    expect(s.especie.clubes_por_escuela).toBe('');
    expect(s.especie.campos_club.logo).toEqual({ pedir: true, obligatorio: true });
    expect(s.especie.campos_club).not.toHaveProperty('hack');
    expect(s.especie.campos[0]).toMatchObject({ ambito: 'club', tipo_campo: 'text', opciones: 'A' });
  });

  it('valida la configuración como el servidor', () => {
    expect(validarConfig(especie.especie)).toEqual({});
    const e = validarConfig({ ...especie.especie, min_integrantes: 5, max_integrantes: 2, kit_nombre: ' ', clubes_por_escuela: 0,
      campos: [...especie.especie.campos, { ...especie.especie.campos[0] }] });
    expect(Object.keys(e).sort()).toEqual(['campos', 'clubes_por_escuela', 'kit_nombre', 'max_integrantes']);
    expect(leerConfig(null)).toEqual(configVacia());
  });
});
