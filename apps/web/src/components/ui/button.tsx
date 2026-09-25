'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Mejorado Button Component con animaciones y estados modernos
 * Basado en Design System COMECYT
 */
/**
 * 14/09/2026 — un solo lenguaje para crear / ver / editar / eliminar en todo el sistema:
 * bordes suaves (14 px), relleno de vidrio sin blur y hover "líquido" (`.btn-liquid`, globals.css).
 * `soft` = ver/editar (vidrio vino), `destructive` = eliminar (vidrio rojo), `default` = crear.
 */
const buttonVariants = cva(
  'btn-liquid group/button inline-flex shrink-0 items-center justify-center rounded-[14px] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,box-shadow,color,transform] duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-[var(--auth-vino-soft)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        // Crear / acción principal: vino sólido con canto sticker 3D que se hunde al pulsar
        default:
          'btn-sticker bg-primary text-primary-foreground hover:bg-[var(--brand-vino-700)] dark:hover:brightness-110',
        // Secundaria con borde suave (antes borde grueso de 2 px)
        outline:
          'border-[1.5px] border-[color-mix(in_oklch,var(--auth-vino)_28%,var(--app-rule))] text-primary bg-[var(--app-card-bg)] hover:bg-[var(--auth-field)] hover:border-primary/50 active:scale-[0.98]',
        // Dorado institucional con canto sticker
        secondary:
          'btn-sticker [--sticker-edge:oklch(56%_0.11_75)] bg-secondary text-secondary-foreground hover:brightness-[1.03] dark:bg-secondary/80 dark:hover:brightness-110',
        // Ghost: acciones discretas en tablas y tarjetas
        ghost:
          'text-[var(--auth-ink-2)] hover:text-[var(--auth-ink)] hover:bg-[var(--auth-field)] active:bg-[var(--auth-field-hover)]',
        // Ver / editar: chip de vidrio vino (mismo dibujo que los íconos del sistema)
        soft:
          'icon-glass text-[var(--auth-vino)] hover:text-[var(--brand-vino-700)]',
        // Eliminar: vidrio rojo, nunca rojo sólido
        destructive:
          'icon-glass text-destructive [--auth-vino:var(--color-destructive)] hover:bg-destructive/10 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        // Link: Underlined text link
        link: 'text-primary underline-offset-4 hover:underline dark:text-primary',
        // CTA principal de una vista (23/09/2026, sistema SIGAE): píldora con contorno arcoíris,
        // igual que "Iniciar sesión" de la landing. Una por vista como máximo. Estilo en panel-sigae.css.
        rainbow: 'btn-rainbow bg-[var(--app-card-bg)] text-[var(--app-ink)]',
      },
      size: {
        default: 'h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: 'h-7 gap-1 rounded-lg px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*="size-"])]:size-3',
        sm: 'h-8 gap-1.5 rounded-[10px] px-3 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*="size-"])]:size-3.5',
        lg: 'h-12 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 text-base',
        icon: 'size-10 rounded-[12px]',
        'icon-xs': 'size-7 rounded-lg [&_svg:not([class*="size-"])]:size-3',
        'icon-sm': 'size-9 rounded-[10px] [&_svg:not([class*="size-"])]:size-4',
        'icon-lg': 'size-11 rounded-[14px] [&_svg:not([class*="size-"])]:size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  icon?: React.ReactNode;
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  isLoading = false,
  disabled,
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className="inline-block"
    >
      <ButtonPrimitive
        data-slot="button"
        data-variant={variant ?? 'default'}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            />
            {children && <span className="ml-2">{children}</span>}
          </>
        ) : (
          <>
            {icon && <span>{icon}</span>}
            {children}
          </>
        )}
      </ButtonPrimitive>
    </motion.div>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
