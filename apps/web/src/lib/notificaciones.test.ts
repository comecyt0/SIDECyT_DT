import { describe, expect, it } from 'vitest';
import { hrefAvisoAdmin, hrefBuzon } from './notificaciones';

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
    expect(hrefAvisoAdmin({ tipo: 'reset_password' })).toBe('/admin/reset-requests');
    expect(hrefAvisoAdmin({ tipo: 'nueva_solicitud_acceso' })).toBe('/admin/solicitudes-acceso');
    expect(hrefAvisoAdmin({ tipo: 'constructor' })).toBeNull();
    expect(hrefAvisoAdmin({ tipo: 'info' })).toBeNull();
  });
  it('otras notificaciones no se desvían', () => {
    expect(hrefBuzon({ tipo: 'aprobacion', conversacion_id: 7 }, '/admin/buzon')).toBeNull();
    expect(hrefBuzon({}, '/admin/buzon')).toBeNull();
  });
});
