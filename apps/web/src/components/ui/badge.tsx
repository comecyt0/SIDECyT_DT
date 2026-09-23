import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// 21/09/2026 — Píldora sticker (rounded-full + borde grueso). Decisión del usuario: se ADOPTAN
// las píldoras estilo Duolingo (deroga la regla previa "rounded-md"). Wine sigue de principal y
// el resto es multicolor. Lo usan 26 vistas de los 4 roles: cambiarlo aquí las actualiza a todas.
// Colores autónomos en className (twMerge) para que estadoBadgeClass() pueda sobreescribir el tono.
const badgeVariants = cva(
  "group/badge inline-flex min-h-[22px] w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold leading-tight whitespace-nowrap align-middle transition-transform duration-150 [a]:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // Vino de marca — soft pill con borde vivo (principal)
        default:
          "border-[oklch(72%_0.11_358)] bg-[oklch(96.5%_0.05_358)] text-[var(--auth-vino)] dark:border-[oklch(50%_0.09_358)] dark:bg-[oklch(32%_0.06_358)] dark:text-[oklch(86%_0.06_358)]",
        // Dorado institucional
        secondary:
          "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/50 dark:bg-amber-900/40 dark:text-amber-200",
        // Peligro / rechazo
        destructive:
          "border-red-300 bg-red-100 text-red-700 dark:border-red-500/50 dark:bg-red-900/40 dark:text-red-200",
        // Neutro con borde
        outline:
          "border-[var(--app-rule)] bg-transparent text-[var(--app-ink-2)]",
        // Discreto
        ghost:
          "border-transparent bg-[var(--auth-field)] text-[var(--app-ink-2)]",
        // Enlace (sin píldora)
        link: "border-0 bg-transparent px-0 py-0 text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
