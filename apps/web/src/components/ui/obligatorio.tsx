import type { ReactNode } from 'react';

/**
 * 08/10/2026 (pedido del usuario) — En todo el sistema el asterisco de campo obligatorio va en rojo y se anuncia a
 * lectores de pantalla. `Asterisco` para JSX; `conAsterisco` convierte una etiqueta de texto que termina en « *».
 */
export function Asterisco() {
  return (
    <>
      <span className="req-ast" aria-hidden="true">*</span>
      <span className="sr-only"> (obligatorio)</span>
    </>
  );
}

export function conAsterisco(label: ReactNode): ReactNode {
  if (typeof label !== 'string') return label;
  const m = /^([\s\S]*?)\s*\*\s*$/.exec(label);
  if (!m) return label;

  return <>{m[1]} <Asterisco /></>;
}

/** Aviso al inicio de un formulario: qué significa el asterisco (más visible que una nota gris). */
export function AvisoObligatorios({ className = '' }: { className?: string }) {
  return (
    <p className={`req-aviso ${className}`}>
      <span className="req-ast" aria-hidden="true">*</span> Los campos marcados con asterisco rojo son obligatorios.
    </p>
  );
}
