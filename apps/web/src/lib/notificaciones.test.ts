import { describe, expect, it } from 'vitest';
import { enlaceAviso, hrefAvisoAdmin, hrefBuzon } from './notificaciones';

describe('enlaceAviso (02/10/2026)', () => {
  it('usa el enlace del servidor solo si es una ruta interna del panel actual', () => {
    expect(enlaceAviso({ enlace: '/admin/clubes/12' }, '/admin/dashboard')).toBe('/admin/clubes/12');
    expect(enlaceAviso({ enlace: '/admin/solicitudes?search=COMECYT-LEGO26-AB12CD' }, '/admin/x')).toBe('/admin/solicitudes?search=COMECYT-LEGO26-AB12CD');
    expect(enlaceAviso({ enlace: '/club/clubes/5' }, '/admin/dashboard')).toBeNull();
    expect(enlaceAviso({ enlace: 'https://evil.example/admin' }, '/admin')).toBeNull();
    expect(enlaceAviso({ enlace: '//evil.example/x' }, '/admin')).toBeNull();
    expect(enlaceAviso({ enlace: '/admin/../x' }, '/admin')).toBeNull();
    expect(enlaceAviso({ enlace: '/admin/x?a=<script>' }, '/admin')).toBeNull();
    expect(enlaceAviso({ enlace: null }, '/admin')).toBeNull();
  });
});

describe('hrefBuzon (E45)', () => {
  it('lleva el aviso del buzón a su hilo', () => {
    expect(hrefBuzon({ tipo: 'buzon_mensaje', conversacion_id: 7 }, '/admin/buzon')).toBe('/admin/buzon?hilo=7');
  });
  it('sin hilo válido lleva al buzón sin parámetro (nada inyectado en la URL)', () => {
    expect(hrefBuzon({ tipo: 'buzon_mensaje', conversacion_id: null }, '/solicitante/buzon')).toBe('/solicitante/buzon');
    expect(hrefBuzon({ tipo: 'buzon_mensaje', conversacion_id: '1&x=<script>' as unknown as number }, '/admin/buzon')).toBe('/admin/buzon');
    expect(hrefBuzon({ tipo: 'buzon_mensaje', conversacion_id: -3 }, '/admin/buzon')).toBe('/admin/buzon');
  });
  it('avisos de acción del admin llevan a su página (rutas fijas)', () => {
    // E68: la recuperación de contraseña ya no pasa por el admin.
    expect(hrefAvisoAdmin({ tipo: 'reset_password' })).toBeNull();
    expect(hrefAvisoAdmin({ tipo: 'nueva_solicitud_acceso' })).toBe('/admin/solicitudes-acceso');
    expect(hrefAvisoAdmin({ tipo: 'constructor' })).toBeNull();
    expect(hrefAvisoAdmin({ tipo: 'info' })).toBeNull();
  });
  it('otras notificaciones no se desvían', () => {
    expect(hrefBuzon({ tipo: 'aprobacion', conversacion_id: 7 }, '/admin/buzon')).toBeNull();
    expect(hrefBuzon({}, '/admin/buzon')).toBeNull();
  });
});
