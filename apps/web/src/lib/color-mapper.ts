/**
 * Color Mapper Utility
 * Centraliza la mapeo de colores hardcodeados a tokens de Design System
 *
 * PROBLEMA RESUELTO: 50+ hardcoded colors scattered across components
 * SOLUCIÓN: Un único source of truth para mapeo de colores
 *
 * USO: En lugar de className="bg-primary"
 *      Usa: className={colorMap.primary.background}
 */

/**
 * Color mapping system para estandarizar colores en toda la app
 * Mapea colores hardcodeados a tokens del Design System
 */
export const colorMap = {
  // ===== PRIMARIOS (Vino COMECYT) =====
  primary: {
    background: 'bg-primary',
    text: 'text-primary',
    foreground: 'text-primary-foreground',
    border: 'border-primary',
    ring: 'ring-primary',
    light: 'bg-primary/10',
    lighter: 'bg-primary/5',
    dark: 'bg-primary/80',
  },

  // ===== SECUNDARIOS (Dorado COMECYT) =====
  secondary: {
    background: 'bg-secondary',
    text: 'text-secondary',
    foreground: 'text-secondary-foreground',
    border: 'border-secondary',
    light: 'bg-secondary/10',
    lighter: 'bg-secondary/5',
    dark: 'bg-secondary/80',
  },

  // ===== ACCENT (Alias para secondary) =====
  accent: {
    background: 'bg-accent',
    text: 'text-accent',
    foreground: 'text-accent-foreground',
    border: 'border-accent',
    light: 'bg-accent/10',
    lighter: 'bg-accent/5',
    glow: 'shadow-[0_0_8px_hsl(var(--accent)/0.4)]',
  },

  // ===== STATES (Semánticos) =====
  states: {
    success: {
      background: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-500',
      main: 'text-emerald-700',
    },
    warning: {
      background: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-500',
      main: 'text-amber-700',
    },
    error: {
      background: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-500',
      main: 'text-red-700',
    },
    info: {
      background: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-500',
      main: 'text-blue-700',
    },
  },

  // ===== NEUTRALS =====
  neutral: {
    background: 'bg-background',
    foreground: 'text-foreground',
    card: 'bg-card text-card-foreground',
    muted: 'text-muted-foreground',
    border: 'border-border',
    input: 'border-input',
    light: 'bg-neutral-50',
    lighter: 'bg-neutral-100',
    medium: 'bg-neutral-200',
  },

  // ===== DESTRUCTIVE (Para acciones peligrosas) =====
  destructive: {
    background: 'bg-destructive',
    text: 'text-destructive',
    foreground: 'text-destructive-foreground',
    border: 'border-destructive',
    light: 'bg-destructive/10',
    lighter: 'bg-destructive/5',
  },
};

/**
 * Badge color mapping
 * Mapea estados de datos a variantes de Badge (solo variantes válidas)
 */
export const badgeColorMap: Record<string, 'link' | 'default' | 'destructive' | 'secondary' | 'outline' | 'ghost'> = {
  // Estados de convocatoria
  activa: 'default',
  cerrada: 'destructive',
  borrador: 'secondary',

  // Estados de solicitud
  enviada: 'default',
  observada: 'outline',
  aprobada: 'default',
  rechazada: 'destructive',
  en_evaluacion: 'default',
  en_revision: 'secondary',

  // Estados de usuario
  activo: 'default',
  inactivo: 'secondary',
  suspendido: 'destructive',

  // Roles
  admin: 'default',
  revisor: 'secondary',
  evaluador: 'default',
  solicitante: 'secondary',
};

/**
 * Sidebar color config
 * Centraliza colores de sidebars para todas las vistas
 */
export const sidebarColorMap = {
  dark: {
    background: 'bg-primary', // Vino oscuro #6B1F3A
    text: 'text-white',
    activeItem: `${colorMap.accent.background} text-white`,
    hoverItem: 'hover:bg-white/10 text-white',
    border: 'border-primary/20',
    shadow: 'shadow-[0_8px_30px_rgba(107,31,58,0.15)]',
  },
  light: {
    background: 'bg-white',
    text: 'text-foreground',
    activeItem: `${colorMap.accent.background} text-accent-foreground`,
    hoverItem: 'hover:bg-neutral-100',
    border: 'border-neutral-200',
    shadow: 'shadow-sm',
  },
};

/**
 * Header color config
 * Centraliza colores de headers
 */
export const headerColorMap = {
  background: 'bg-white/80 backdrop-blur-md',
  border: 'border-neutral-100',
  text: 'text-foreground',
  shadow: 'shadow-sm',
  input: 'bg-neutral-100 focus-within:ring-primary/50',
};

/**
 * Shadow mapping
 * Centraliza sombras
 */
export const shadowMap = {
  soft: 'shadow-soft',
  softXl: 'shadow-[0_20px_25px_-5px_rgba(107,31,58,0.08)]',
  glow: 'shadow-[0_0_30px_rgba(107,31,58,0.15)]',
  card: 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]',
  modal: 'shadow-2xl',
};

/**
 * Spacing mapping
 * Centraliza valores de espaciado
 */
export const spacingMap = {
  xs: 'gap-1',      // 4px
  sm: 'gap-2',      // 8px
  md: 'gap-3',      // 12px
  base: 'gap-4',    // 16px
  lg: 'gap-6',      // 24px
  xl: 'gap-8',      // 32px
  '2xl': 'gap-12',  // 48px
};

/**
 * Helper para crear className combinado
 */
export function cn(...classes: (string | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Helper para mapear estado a color
 * Útil para badges dinámicas
 */
export function getStateColor(state: string): string {
  return badgeColorMap[state as keyof typeof badgeColorMap] || 'default';
}

/**
 * Helper para mapear estado a colores de texto/fondo
 * Útil para displays customizados
 */
export function getStateColorClasses(state: string): { bg: string; text: string } {
  const stateColorMap: Record<string, { bg: string; text: string }> = {
    // Convocatorias
    activa: { bg: colorMap.states.success.background, text: colorMap.states.success.text },
    cerrada: { bg: colorMap.states.error.background, text: colorMap.states.error.text },
    borrador: { bg: colorMap.neutral.medium, text: 'text-neutral-700' },

    // Solicitudes
    enviada: { bg: colorMap.states.info.background, text: colorMap.states.info.text },
    observada: { bg: colorMap.states.warning.background, text: colorMap.states.warning.text },
    aprobada: { bg: colorMap.states.success.background, text: colorMap.states.success.text },
    rechazada: { bg: colorMap.states.error.background, text: colorMap.states.error.text },
    en_evaluacion: { bg: colorMap.states.info.background, text: colorMap.states.info.text },
    en_revision: { bg: colorMap.states.warning.background, text: colorMap.states.warning.text },

    // Usuarios
    activo: { bg: colorMap.states.success.background, text: colorMap.states.success.text },
    inactivo: { bg: colorMap.neutral.light, text: 'text-neutral-600' },
    suspendido: { bg: colorMap.states.error.background, text: colorMap.states.error.text },

    // Ministraciones (revision, autorizada, pagada usan los states, rechazada y pendiente aquí)
    pendiente: { bg: colorMap.neutral.light, text: 'text-neutral-600' },
    revision: { bg: colorMap.states.warning.background, text: colorMap.states.warning.text },
    autorizada: { bg: colorMap.states.info.background, text: colorMap.states.info.text },
    pagada: { bg: colorMap.states.success.background, text: colorMap.states.success.text },
  };

  return stateColorMap[state] || { bg: colorMap.neutral.light, text: colorMap.neutral.muted };
}

/**
 * Recomendaciones de migración:
 *
 * ❌ ANTES (Hardcoded):
 * className="bg-primary text-white"
 * className="bg-accent text-white"
 * className="bg-green-100 text-green-800"
 *
 * ✅ DESPUÉS (Usando colorMap):
 * className={`${colorMap.primary.background} ${colorMap.primary.foreground}`}
 * className={`${colorMap.secondary.background} ${colorMap.secondary.foreground}`}
 * className={`${colorMap.states.success.background} ${colorMap.states.success.text}`}
 */

export default colorMap;
