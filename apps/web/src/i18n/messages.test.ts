import { describe, it, expect } from 'vitest';
import es from './messages/es.json';
import en from './messages/en.json';

/** Rutas "a.b.c" de todas las hojas de un diccionario. */
function claves(obj: Record<string, unknown>, prefijo = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? claves(v as Record<string, unknown>, `${prefijo}${k}.`) : [`${prefijo}${k}`],
  );
}

// E50: el menú, la barra, el pie y los avisos viven en el diccionario; si falta una clave en un idioma, el panel
// mostraría la clave cruda al cambiar de idioma.
describe('diccionarios i18n', () => {
  it('es.json y en.json tienen exactamente las mismas claves', () => {
    expect(claves(en).sort()).toEqual(claves(es).sort());
  });

  it('ningún texto queda vacío', () => {
    for (const dic of [es, en]) {
      for (const k of claves(dic)) {
        const valor = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], dic);
        expect(String(valor).trim(), k).not.toBe('');
      }
    }
  });
});
