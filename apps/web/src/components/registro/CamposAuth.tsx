'use client';

import { conAsterisco } from '@/components/ui/obligatorio';
import { Children, cloneElement, isValidElement, type ReactElement, type InputHTMLAttributes, type ComponentType, type ReactNode } from 'react';

/**
 * Campos del sistema --auth-* (login, registro). Extraídos de "Solicitar acceso" (E52) para reutilizarlos en /registro.
 * FField: etiqueta flotante; clona el <input> hijo para inyectarle `id` y dejar el label asociado (WCAG 1.3.1).
 */
export function FField({ id, icon: Icon, label, children, ayuda }: {
  id: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
  ayuda?: string;
}) {
  const kids = Children.map(children, (child) =>
    isValidElement(child) && child.type === 'input'
      ? cloneElement(child as ReactElement<InputHTMLAttributes<HTMLInputElement>>, { id, 'aria-describedby': ayuda ? `${id}-ayuda` : undefined })
      : child,
  );
  return (
    <div>
      <div className="auth-field">
        {kids}
        <label htmlFor={id} className="auth-label">{conAsterisco(label)}</label>
        <Icon className="auth-field-icon" aria-hidden="true" />
      </div>
      {ayuda && <p id={`${id}-ayuda`} className="mt-1 px-1 text-[11.5px] text-[var(--auth-ink-2)]">{ayuda}</p>}
    </div>
  );
}

/** Etiqueta estática arriba — para select / textarea / archivo, donde flotar no aplica. */
export function StaticField({ id, icon: Icon, label, children }: {
  id: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  const kids = Children.map(children, (child) =>
    isValidElement(child) && (child.type === 'select' || child.type === 'textarea' || child.type === 'input')
      ? cloneElement(child as ReactElement<{ id?: string }>, { id })
      : child,
  );
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-bold text-[var(--auth-ink-2)]">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {conAsterisco(label)}
      </label>
      <div className="relative">{kids}</div>
    </div>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="w-32 shrink-0 text-[var(--auth-ink-2)]">{label}:</span>
      <span className="min-w-0 font-medium text-[var(--auth-ink)] [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}
