/**
 * Centralized role IDs — must stay in sync with config/comecyt.php on the backend.
 * Backend source of truth: config('comecyt.roles.X')
 * Frontend equivalent: ROLES.X
 */
export const ROLES = {
  ADMIN: 1,
  REVISOR: 2,
  EVALUADOR: 3,
  SOLICITANTE: 4,
} as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];
