/**
 * COMECYT Design System - Design Tokens
 * Centraliza todas las decisiones visuales del sistema
 *
 * Paleta Corporativa COMECYT:
 * - Primario: Vino Oscuro (#6B1F3A) - Confianza, autoridad
 * - Secundario: Dorado (#C9A96E) - Elegancia, lujo
 * - Neutrales: Grises profesionales
 */

export const designTokens = {
  // ===== COLORES =====
  colors: {
    // Brand Colors
    primary: {
      50: '#F9E8F0',
      100: '#F3D1E1',
      200: '#E7A3C3',
      300: '#DB75A5',
      400: '#CF4787',
      500: '#C31969',
      600: '#9C1553',
      700: '#6B1F3A', // Core brand color
      800: '#4A1527',
      900: '#290B14',
    },
    secondary: {
      50: '#FFFAF0',
      100: '#FFF5E1',
      200: '#FFE8C2',
      300: '#FFDBA3',
      400: '#FFD084',
      500: '#C9A96E', // Core accent
      600: '#B89758',
      700: '#A78542',
      800: '#96732C',
      900: '#856116',
    },
    // Semantic Colors
    success: {
      light: '#E6F9F0',
      main: '#10B981',
      dark: '#059669',
    },
    warning: {
      light: '#FEF3C7',
      main: '#F59E0B',
      dark: '#D97706',
    },
    error: {
      light: '#FEE2E2',
      main: '#EF4444',
      dark: '#DC2626',
    },
    info: {
      light: '#EFF6FF',
      main: '#3B82F6',
      dark: '#1D4ED8',
    },
    // Neutrals
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      150: '#F0F0F0',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    // Alias utilities
    background: '#FAFAFA',
    backgroundSecondary: '#FFFFFF',
    foreground: '#1F2937',
    border: '#E5E5E5',
    borderLight: '#F0F0F0',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
  },

  // ===== TIPOGRAFÍA =====
  typography: {
    // Font stacks
    fontFamily: {
      sans: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'Fira Code', 'Courier New', monospace",
    },
    // Font sizes with line heights
    fontSize: {
      xs: { size: '0.75rem', lineHeight: '1rem' },      // 12px
      sm: { size: '0.875rem', lineHeight: '1.25rem' },  // 14px
      base: { size: '1rem', lineHeight: '1.5rem' },     // 16px
      lg: { size: '1.125rem', lineHeight: '1.75rem' },  // 18px
      xl: { size: '1.25rem', lineHeight: '1.75rem' },   // 20px
      '2xl': { size: '1.5rem', lineHeight: '2rem' },    // 24px
      '3xl': { size: '1.875rem', lineHeight: '2.25rem' }, // 30px
      '4xl': { size: '2.25rem', lineHeight: '2.5rem' },  // 36px
      '5xl': { size: '3rem', lineHeight: '1' },         // 48px
    },
    // Font weights
    fontWeight: {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    // Line heights
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
    // Letter spacing
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // ===== ESPACIADO =====
  spacing: {
    xs: '0.25rem',     // 4px
    sm: '0.5rem',      // 8px
    md: '1rem',        // 16px
    lg: '1.5rem',      // 24px
    xl: '2rem',        // 32px
    '2xl': '3rem',     // 48px
    '3xl': '4rem',     // 64px
    '4xl': '6rem',     // 96px
  },

  // ===== BORDER RADIUS =====
  borderRadius: {
    none: '0',
    sm: '0.375rem',    // 6px
    base: '0.5rem',    // 8px
    md: '0.75rem',     // 12px
    lg: '1rem',        // 16px
    xl: '1.5rem',      // 24px
    '2xl': '2rem',     // 32px
    full: '9999px',
  },

  // ===== SOMBRAS =====
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    // Branded shadows
    softXl: '0 20px 25px -5px rgba(107, 31, 58, 0.08), 0 8px 10px -6px rgba(107, 31, 58, 0.05)',
    soft: '0 10px 15px -3px rgba(107, 31, 58, 0.06)',
    glow: '0 0 30px rgba(201, 169, 110, 0.15)',
    glowPrimary: '0 0 30px rgba(107, 31, 58, 0.15)',
  },

  // ===== TRANSICIONES =====
  transitions: {
    // Durations
    duration: {
      fast: '150ms',
      base: '300ms',
      slow: '500ms',
      slower: '700ms',
    },
    // Easing functions
    easing: {
      // Smooth, professional easing
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      // Bounce/energetic
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      // Sharp
      sharp: 'cubic-bezier(0.4, 0, 1, 1)',
      // Gentle (preferred for UI)
      gentle: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    // Common transitions
    common: {
      color: 'color 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      all: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // ===== BREAKPOINTS =====
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ===== Z-INDEX SCALE =====
  zIndex: {
    hide: '-1',
    base: '0',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modal: '1040',
    popover: '1050',
    tooltip: '1060',
  },
};

/**
 * Component-specific design tokens
 * Para mantener consistencia en componentes específicos
 */
export const componentTokens = {
  button: {
    base: {
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    },
    variants: {
      primary: {
        background: designTokens.colors.primary[700],
        color: '#FFFFFF',
        hover: {
          background: designTokens.colors.primary[800],
          shadow: designTokens.shadows.soft,
        },
        active: {
          transform: 'translateY(1px)',
        },
        disabled: {
          opacity: 0.5,
          cursor: 'not-allowed',
        },
      },
      secondary: {
        background: designTokens.colors.secondary[500],
        color: '#FFFFFF',
        hover: {
          background: designTokens.colors.secondary[600],
          shadow: designTokens.shadows.soft,
        },
      },
      outline: {
        background: 'transparent',
        border: `2px solid ${designTokens.colors.primary[700]}`,
        color: designTokens.colors.primary[700],
        hover: {
          background: designTokens.colors.primary[50],
        },
      },
      ghost: {
        background: 'transparent',
        color: designTokens.colors.primary[700],
        hover: {
          background: designTokens.colors.neutral[100],
        },
      },
    },
    sizes: {
      sm: {
        padding: '0.375rem 0.75rem',
        fontSize: '0.75rem',
      },
      md: {
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
      },
      lg: {
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
      },
    },
  },

  input: {
    base: {
      padding: '0.75rem 1rem',
      fontSize: '0.875rem',
      borderRadius: '0.5rem',
      border: `2px solid ${designTokens.colors.border}`,
      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    states: {
      focus: {
        borderColor: designTokens.colors.primary[700],
        boxShadow: `0 0 0 3px ${designTokens.colors.primary[50]}`,
        outline: 'none',
      },
      error: {
        borderColor: designTokens.colors.error.main,
        boxShadow: `0 0 0 3px ${designTokens.colors.error.light}`,
      },
      disabled: {
        background: designTokens.colors.neutral[100],
        opacity: 0.6,
        cursor: 'not-allowed',
      },
    },
  },

  card: {
    base: {
      background: designTokens.colors.backgroundSecondary,
      borderRadius: '1rem',
      border: `1px solid ${designTokens.colors.border}`,
      padding: '1.5rem',
      boxShadow: designTokens.shadows.xs,
      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    hover: {
      boxShadow: designTokens.shadows.md,
      transform: 'translateY(-2px)',
    },
  },
};

/**
 * Utility function para aplicar design tokens en componentes
 */
export const applyDesignToken = (category: string, token: string): string => {
  const tokens: Record<string, any> = designTokens as any;
  const keys = category.split('.');
  let value: any = tokens;

  for (const key of keys) {
    value = value?.[key];
  }

  return value?.[token] || '';
};

export default designTokens;
