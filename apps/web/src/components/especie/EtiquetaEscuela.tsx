import { History, Sparkles } from 'lucide-react';

/**
 * 08/10/2026 (pedido del usuario) — Identificador de la escuela en todo lugar donde aparece: «Ya participó» si el admin la
 * marcó en /admin/escuelas (participo_antes) y «Nueva escuela» si no. Sin dato (respuesta antigua), no se pinta.
 */
export default function EtiquetaEscuela({ participo, className = '' }: { participo: boolean | null | undefined; className?: string }) {
  if (typeof participo !== 'boolean') return null;
  return participo
    ? <span className={`pill shrink-0 ${className}`} data-tone="emerald"><History className="h-3 w-3" aria-hidden="true" />Ya participó</span>
    : <span className={`pill shrink-0 ${className}`} data-tone="sky"><Sparkles className="h-3 w-3" aria-hidden="true" />Nueva escuela</span>;
}
