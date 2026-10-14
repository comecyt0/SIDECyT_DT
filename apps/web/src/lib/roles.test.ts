import { describe, it, expect } from 'vitest';
import { PANEL_POR_ROL, ROLES, subrutaPermitida, type RoleId } from './roles';

describe('ROLES', () => {
  it('mapea los cuatro roles del sistema con los IDs esperados', () => {
    expect(ROLES.ADMIN).toBe(1);
    expect(ROLES.REVISOR).toBe(2);
    expect(ROLES.EVALUADOR).toBe(3);
    expect(ROLES.SOLICITANTE).toBe(4);
  });

  it('incluye los roles de E45, E52 y el acompañante de club de E61 (nueve en total)', () => {
    expect(ROLES.ADMIN_CONVOCATORIA).toBe(5);
    expect(ROLES.CONSULTA).toBe(6);
    expect(ROLES.LIDER_CLUB).toBe(7);
    expect(ROLES.OPERADOR_EVENTO).toBe(8);
    expect(ROLES.ACOMPANANTE_CLUB).toBe(9);
    expect(Object.keys(ROLES)).toHaveLength(9);
    expect(PANEL_POR_ROL.acompanante_club).toBe('/club/dashboard');
  });

  it('el operador de evento entra a su panel de escaneo; consulta no ve el escaneo del admin', () => {
    expect(PANEL_POR_ROL.operador_evento).toBe('/operador/escanear');
    expect(subrutaPermitida('admin_convocatoria', '/admin/escanear')).toBe(true);
    expect(subrutaPermitida('consulta', '/admin/escanear')).toBe(false);
  });

  it('el evaluador entra al panel de evaluación compartido SIGAE/SICEI (E72)', () => {
    expect(PANEL_POR_ROL.evaluador).toBe('/evaluador');
  });

  it('produce IDs únicos para cada rol', () => {
    const values = Object.values(ROLES);
    expect(new Set(values).size).toBe(values.length);
  });

  it('RoleId acepta sólo los valores válidos', () => {
    const valid: RoleId = ROLES.ADMIN;
    expect([1, 2, 3, 4, 5, 6]).toContain(valid);
  });
});
