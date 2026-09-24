/**
 * Política de contraseñas (SEGURIDAD, 24/09/2026). Espejo de `Password::defaults()` del backend
 * (AppServiceProvider): mínimo 10 caracteres, mayúsculas, minúsculas y al menos un número.
 * El front avisa antes de enviar; el backend es quien la hace cumplir (regla de 2 capas).
 */
export const PASSWORD_MIN = 10;

export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN} caracteres, con mayúsculas, minúsculas y al menos un número.`;

/** Devuelve el primer problema en español, o null si cumple. */
export function validarPassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) return 'La contraseña debe incluir mayúsculas y minúsculas.';
  if (!/[0-9]/.test(pw)) return 'La contraseña debe incluir al menos un número.';
  return null;
}
