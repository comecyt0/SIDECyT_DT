import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/**
 * Marco pastel — v3 (24/09/2026). La "tarjeta de producto" de la referencia Aboard: un lavado pastel
 * suave (radio 32) que enmarca paneles blancos, en lugar de sombras. Tonos rebajados para no saturar
 * (ver `--pastel-*` en styles/panel-sigac.css); rotarlos entre secciones da el ritmo papel → pastel → papel.
 */
export type PastelTone = 'blush' | 'lavender' | 'mint' | 'powder' | 'butter' | 'vino';

interface Props {
  tone?: PastelTone;
  title?: ReactNode;
  description?: ReactNode;
  /** Enlace "ver todo" en la cabecera del marco. */
  action?: { href: string; label: string };
  /** Contenido de la derecha de la cabecera (botones, filtros). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** id del título, para `aria-labelledby`. */
  titleId?: string;
}

export default function PastelFrame({ tone = 'lavender', title, description, action, aside, children, className = '', titleId }: Props) {
  return (
    <section className={`pastel-frame ${className}`} data-pastel={tone} aria-labelledby={title ? titleId : undefined}>
      {(title || description || action || aside) && (
        <div className="pastel-frame-head">
          <div className="min-w-0">
            {title && <h2 id={titleId} className="pastel-frame-title">{title}</h2>}
            {description && <p className="pastel-frame-desc">{description}</p>}
          </div>
          {(action || aside) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {aside}
              {action && (
                <Link href={action.href} className="pastel-frame-link">
                  {action.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
