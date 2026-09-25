import { describe, expect, it } from 'vitest';
import { enlaceSeguro, parseSitio, SITIO_VACIO } from './sitio';

describe('contenido público de SIDECyT (E49)', () => {
  it('acepta un programa válido y normaliza ícono/tono desconocidos', () => {
    const s = parseSitio({ programas: [{ nombre: 'Prototipos', correo: 'dt.prototipos@edomex.gob.mx', url_info: 'https://comecyt.edomex.gob.mx/x', icono: 'nuclear', tono: 'rojo' }] });
    expect(s.programas[0]).toMatchObject({ nombre: 'Prototipos', correo: 'dt.prototipos@edomex.gob.mx', url_info: 'https://comecyt.edomex.gob.mx/x', icono: 'lightbulb', tono: 'sky' });
  });
  it('descarta enlaces peligrosos o de otros dominios y correos inválidos', () => {
    const s = parseSitio({ programas: [
      { nombre: 'A', url_info: 'javascript:alert(1)', correo: '<script>@x' },
      { nombre: 'B', url_info: 'https://comecyt.edomex.gob.mx.evil.com/', correo: 'no-es-correo' },
      { nombre: 'C', url_info: 'http://comecyt.edomex.gob.mx/' },
      { nombre: 'D', url_info: 'https://usuario@comecyt.edomex.gob.mx/' },
    ] });
    expect(s.programas.map((p) => p.url_info)).toEqual([null, null, null, null]);
    expect(s.programas[0].correo).toBeNull();
    expect(s.programas[1].correo).toBeNull();
  });
  it('ignora registros sin nombre y respuestas que no son objeto', () => {
    expect(parseSitio({ programas: [{ resumen: 'x' }, null, 'basura'] }).programas).toHaveLength(0);
    expect(parseSitio(null)).toEqual(SITIO_VACIO);
    expect(parseSitio('texto')).toEqual(SITIO_VACIO);
  });
  it('listas: solo textos, recortados y con tope', () => {
    const s = parseSitio({ sectores: ['Salud', 3, '', ' Textil '], documentos: [{ titulo: 'Ficha' }, { detalle: 'sin título' }], documentos_notas: ['Nota'] });
    expect(s.sectores).toEqual(['Salud', 'Textil']);
    expect(s.documentos).toEqual([{ titulo: 'Ficha', detalle: '' }]);
    expect(s.documentos_notas).toEqual(['Nota']);
  });
  it('enlaceSeguro solo https de dominios del COMECYT', () => {
    expect(enlaceSeguro('https://comecyt.edomex.gob.mx/marcas')).toBe('https://comecyt.edomex.gob.mx/marcas');
    expect(enlaceSeguro('https://ejemplo.com')).toBeNull();
  });
});
