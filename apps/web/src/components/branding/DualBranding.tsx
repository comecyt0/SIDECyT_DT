'use client';

import Image from 'next/image';
import { LOGO_COMECYT } from '@/lib/identidad';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface DualBrandingProps {
  /** Tamaño del logo. Default: 'md'. */
  size?: Size;
  /** Se conserva por compatibilidad (antes apilaba COMECYT + Edomex). */
  vertical?: boolean;
  /** Clases extra opcionales. */
  className?: string;
}

/**
 * Logo institucional de las páginas de acceso (login, recuperar contraseña, solicitar acceso).
 *
 * E50 (28/09/2026): usa el logo oficial COMECYT 2026 (`lib/identidad.ts`). El par COMECYT + "logo Edomex" (un
 * marcador de posición controlado por NEXT_PUBLIC_EDOMEX_LOGO_URL, apagado en producción) se retiró: la presencia
 * del Gobierno del Estado de México va ahora en la franja institucional oficial (`FranjaInstitucional`), que el
 * manual de identidad define como la única combinación válida de logos.
 * El logo nunca se recolorea: sobre fondo oscuro se usa la versión negativa oficial (otro componente).
 */
export default function DualBranding({ size = 'md', className = '' }: DualBrandingProps) {
  // El archivo oficial ya viene ajustado al dibujo (≈2.3:1): alturas menores que las del logo anterior, que
  // traía ~46 % de margen transparente.
  const alto = {
    sm: 'h-7',
    md: 'h-10 md:h-12',
    lg: 'h-16 md:h-20',
    xl: 'h-20 md:h-24', // login: logo protagonista sobre el formulario
  } as const;
  const l = LOGO_COMECYT.color;

  return (
    <div className={`flex items-center ${className}`.trim()} data-testid="dual-branding">
      <Image
        src={l.src}
        alt={l.alt}
        width={l.ancho}
        height={l.alto}
        priority
        className={`${alto[size]} w-auto object-contain`}
      />
    </div>
  );
}
