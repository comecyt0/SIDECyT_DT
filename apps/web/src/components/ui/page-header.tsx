import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  /** Qué puede hacer la persona aquí, en una frase llana. */
  description?: ReactNode;
  icon?: ReactNode;
  /** Etiqueta pequeña encima del título (p. ej. el folio o la sección). Se pinta como píldora de aviso. */
  eyebrow?: ReactNode;
  /** Botones a la derecha (crear, exportar…). */
  actions?: ReactNode;
  /** Enlace de regreso: pinta la flecha a la izquierda del título. */
  backHref?: string;
  backLabel?: string;
}

/**
 * Encabezado de página — v3 (24/09/2026, sistema SIGAC: héroe de la landing + referencia Aboard).
 * Píldora de aviso (lavado cielo con punto) → título grande Satoshi con tracking cerrado y barra vino →
 * descripción en gris. Acciones en píldora a la derecha (debajo en teléfono). Mismo API en las 33 vistas.
 * Estilos: `.panel-hero*` en styles/panel-sigac.css.
 */
export default function PageHeader({ title, description, icon, eyebrow, actions, backHref, backLabel = 'Volver' }: PageHeaderProps) {
  return (
    <header className="panel-hero">
      <div className="panel-hero-main">
        {backHref ? (
          <Link href={backHref} aria-label={backLabel} title={backLabel} className="panel-hero-back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          icon && <span className="panel-hero-icon" aria-hidden="true">{icon}</span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="panel-hero-pill"><span aria-hidden="true" />{eyebrow}</p>
          )}
          <h1 className="page-title panel-hero-title">{title}</h1>
          {description && <p className="panel-hero-desc">{description}</p>}
        </div>
      </div>
      {actions && <div className="panel-hero-actions">{actions}</div>}
    </header>
  );
}
