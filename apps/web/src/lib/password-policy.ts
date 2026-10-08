/**
 * Política de contraseñas (SEGURIDAD, 24/09/2026). Espejo de `Password::defaults()` del backend
 * (AppServiceProvider): mínimo 10 caracteres, mayúsculas, minúsculas y al menos un número.
 * El front avisa antes de enviar; el backend es quien la hace cumplir (regla de 2 capas).
 */
export const PASSWORD_MIN = 10;

export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN} caracteres, con mayúsculas, minúsculas y al menos un número.`;

/** Requisitos de la política, uno por línea (checklist del semáforo). */
export function requisitosPassword(pw: string): { texto: string; ok: boolean }[] {
  return [
    { texto: `${PASSWORD_MIN} caracteres o más`, ok: pw.length >= PASSWORD_MIN },
    { texto: 'Mayúsculas y minúsculas', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { texto: 'Al menos un número', ok: /[0-9]/.test(pw) },
  ];
}

/**
 * Semáforo (08/10/2026, pedido del usuario): 0 = vacía, 1 = débil (rojo), 2 = regular (amarillo: le falta algo),
 * 3 = segura (verde: cumple la política), 4 = muy segura (verde: además 14+ caracteres o un símbolo).
 * Solo orienta: la que no cumple la política la rechaza igual el servidor.
 */
export function fuerzaPassword(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  const cumplidos = requisitosPassword(pw).filter((r) => r.ok).length;
  if (cumplidos < 3) return cumplidos <= 1 ? 1 : 2;
  return pw.length >= 14 || /[^A-Za-z0-9]/.test(pw) ? 4 : 3;
}

/** Devuelve el primer problema en español, o null si cumple. */
export function validarPassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) return 'La contraseña debe incluir mayúsculas y minúsculas.';
  if (!/[0-9]/.test(pw)) return 'La contraseña debe incluir al menos un número.';
  return null;
}
