/* eslint-disable @next/next/no-img-element -- logos institucionales: <img> simple con sus medidas reales */
import { LOGO_COMECYT, LOGO_CONVIVENCIA } from '@/lib/identidad';

/**
 * E50 — Logos oficiales. Siempre con sus proporciones reales (ancho/alto del archivo) y nunca recoloreados con
 * filtros CSS: para fondos oscuros se usa la versión NEGATIVA oficial (manual de identidad).
 */
export function LogoComecyt({
  variante = 'color', className = '', decorativo = false, alto,
}: { variante?: keyof typeof LOGO_COMECYT; className?: string; decorativo?: boolean; alto?: number }) {
  const l = LOGO_COMECYT[variante];
  return (
    <img
      src={l.src}
      alt={decorativo ? '' : l.alt}
      width={l.ancho}
      height={l.alto}
      className={`w-auto object-contain ${className}`}
      style={alto ? { height: alto } : undefined}
      draggable={false}
    />
  );
}

/**
 * Banda institucional: la franja oficial en la parte superior (encabezado) de las páginas públicas y de acceso.
 * Regla del usuario (28/09/2026): va en el encabezado de todo el sistema, NO en pies, y NO en los paneles.
 * Estilos: `.banda-institucional` (globals.css).
 */
export function BandaInstitucional({ className = '' }: { className?: string }) {
  return (
    <div className={`banda-institucional ${className}`.trim()}>
      {/* El marco limita el ancho: la imagen trae `w-full max-w-full` (utilidades que ganan a la capa de estilos). */}
      <div className="banda-institucional-marco">
        <FranjaInstitucional />
      </div>
    </div>
  );
}

/**
 * Franja institucional (convivencia de logos). Muy ancha (≈13:1): se limita por ancho y conserva su proporción.
 * `claro` sobre fondos claros (versión a color); `oscuro` sobre fondos oscuros (negativo A, escudo dorado).
 */
export function FranjaInstitucional({ tono = 'claro', className = '' }: { tono?: 'claro' | 'oscuro'; className?: string }) {
  const l = tono === 'oscuro' ? LOGO_CONVIVENCIA.negativoA : LOGO_CONVIVENCIA.color;
  return (
    <img
      src={l.src}
      alt={l.alt}
      width={l.ancho}
      height={l.alto}
      className={`franja-institucional h-auto w-full max-w-full object-contain ${className}`}
      draggable={false}
    />
  );
}
