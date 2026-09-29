import { describe, it, expect } from 'vitest';
import { ROLES, type RoleId } from './roles';

describe('ROLES', () => {
  it('mapea los cuatro roles del sistema con los IDs esperados', () => {
    expect(ROLES.ADMIN).toBe(1);
    expect(ROLES.REVISOR).toBe(2);
    expect(ROLES.EVALUADOR).toBe(3);
    expect(ROLES.SOLICITANTE).toBe(4);
  });

  it('incluye los roles de E45 y el líder de club de E52 (siete en total)', () => {
    expect(ROLES.ADMIN_CONVOCATORIA).toBe(5);
    expect(ROLES.CONSULTA).toBe(6);
    expect(ROLES.LIDER_CLUB).toBe(7);
    expect(Object.keys(ROLES)).toHaveLength(7);
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
