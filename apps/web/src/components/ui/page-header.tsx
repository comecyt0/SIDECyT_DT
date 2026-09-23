import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  /** Qué puede hacer la persona aquí, en una frase llana. */
  description?: ReactNode;
  icon?: ReactNode;
  /** Etiqueta pequeña encima del título (p. ej. el folio o la sección). */
  eyebrow?: ReactNode;
  /** Botones a la derecha (crear, exportar…). */
  actions?: ReactNode;
  /** Enlace de regreso: pinta la flecha a la izquierda del título. */
  backHref?: string;
  backLabel?: string;
}

/** Encabezado de página del panel (14/09/2026): mismo dibujo en todas las vistas de los 4 roles. */
export default function PageHeader({ title, description, icon, eyebrow, actions, backHref, backLabel = 'Volver' }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {backHref && (
          <Link href={backHref} aria-label={backLabel} title={backLabel} className="btn-liquid mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border text-[var(--app-ink)] transition-colors hover:bg-[var(--app-hover-bg)]" style={{ borderColor: 'var(--app-rule)' }}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        {icon && !backHref && <span className="app-tile-icon shrink-0 mt-0.5">{icon}</span>}
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--auth-vino)' }}>{eyebrow}</p>}
          <h1 className="page-title text-[clamp(1.5rem,2.4vw,1.875rem)] font-bold tracking-tight text-[var(--app-ink)] leading-tight break-words">{title}</h1>
          {description && <p className="text-[var(--app-ink-2)] mt-1 text-sm sm:text-base">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end shrink-0">{actions}</div>}
    </div>
  );
}
