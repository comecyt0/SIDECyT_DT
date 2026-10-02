import { Globe2 } from 'lucide-react';
import { MODALIDADES, leerModalidad } from '@/lib/especie';

/** Recuerda al líder para qué modalidad de la convocatoria (estatal, nacional o internacional) captura cada apartado. */
export default function ModalidadChip({ modalidad, className = '' }: { modalidad: unknown; className?: string }) {
  const m = leerModalidad(modalidad);
  return (
    <span className={`pill inline-flex items-center gap-1 ${className}`} data-tone={m === 'estatal' ? 'sky' : m === 'nacional' ? 'violet' : 'gold'}>
      <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
      Modalidad: {MODALIDADES[m]}
    </span>
  );
}
