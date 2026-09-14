'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Mejorado Button Component con animaciones y estados modernos
 * Basado en Design System COMECYT
 */
const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        // Primary: glow del brand al hover + shimmer (luz diagonal) overlay
        default:
          'btn-shimmer bg-primary text-primary-foreground shadow-soft hover:shadow-[0_8px_24px_-4px_var(--brand-vino)] hover:-translate-y-0.5 active:translate-y-0 dark:bg-primary dark:hover:brightness-110',
        // Outline: Subtle border con halo del brand al hover
        outline:
          'border-2 border-primary text-primary bg-transparent hover:bg-primary/10 hover:border-primary hover:shadow-[0_4px_16px_-4px_var(--brand-vino)] dark:hover:bg-primary/20',
        // Secondary: accent con glow dorado al hover
        secondary:
          'btn-shimmer bg-secondary text-secondary-foreground shadow-soft hover:shadow-[0_8px_24px_-4px_var(--brand-gold)] hover:-translate-y-0.5 dark:bg-secondary/80 dark:hover:brightness-110',
        // Ghost: Minimal, text-focused
        ghost:
          'text-foreground hover:bg-muted/50 active:bg-muted dark:hover:bg-muted/30',
        // Destructive: Red for dangerous actions
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        // Link: Underlined text link
        link: 'text-primary underline-offset-4 hover:underline dark:text-primary',
      },
      size: {
        default: 'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        xs: 'h-7 gap-1 rounded-md px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*="size-"])]:size-3',
        sm: 'h-8 gap-1 rounded-md px-2.5 text-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*="size-"])]:size-3.5',
        lg: 'h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 text-base',
        icon: 'size-9',
        'icon-xs': 'size-7 rounded-md [&_svg:not([class*="size-"])]:size-3',
        'icon-sm': 'size-8 rounded-md [&_svg:not([class*="size-"])]:size-4',
        'icon-lg': 'size-10 rounded-lg [&_svg:not([class*="size-"])]:size-5',
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
