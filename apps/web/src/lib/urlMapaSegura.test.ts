import { describe, expect, it } from 'vitest';
import { urlMapaSegura } from '@/lib/especie';

/** E94: el enlace de ubicación de una escuela solo se pinta si es de Google Maps o Apple Maps por https. */
describe('urlMapaSegura', () => {
  it('acepta enlaces de mapas conocidos', () => {
    for (const u of [
      'https://maps.app.goo.gl/ePBpv77SToVjTkHN6',
      "https://www.google.com.mx/maps/place/19°07'42.5%22N/@19.1,-99.9,17z",
      'https://www.google.com/maps/place/Escuela/@19.2,-99.6,17z',
      'https://maps.google.com/?q=19.5,-98.9',
      'https://goo.gl/maps/abc',
      'https://share.google/abc',
      'https://maps.apple.com/?ll=19.2,-99.6',
    ]) expect(urlMapaSegura(u)).toBe(u);
  });

  it('rechaza esquemas peligrosos, sitios ajenos y trucos', () => {
    for (const u of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'http://maps.app.goo.gl/x',
      'https://evil.example/maps/x',
      'https://acortar.link/BrqOVR',
      'https://usuario:clave@maps.app.goo.gl/x',
      'https://www.google.com/search?q=escuela',
      'https://goo.gl/otra',
      'https://maps.app.goo.gl/x"onmouseover="alert(1)',
      'https://maps.app.goo.gl:8443/x',
      'https://maps.app.goo.gl.evil.example/x',
      '//maps.app.goo.gl/x',
      'https://maps.app.goo.gl/x https://evil.example',
      `https://maps.app.goo.gl/${'a'.repeat(1000)}`,
      '',
    ]) expect(urlMapaSegura(u)).toBeNull();
  });

  it('ignora valores que no son texto', () => {
    expect(urlMapaSegura(null)).toBeNull();
    expect(urlMapaSegura(undefined)).toBeNull();
    expect(urlMapaSegura(42)).toBeNull();
    expect(urlMapaSegura({ href: 'https://maps.app.goo.gl/x' })).toBeNull();
  });
});
