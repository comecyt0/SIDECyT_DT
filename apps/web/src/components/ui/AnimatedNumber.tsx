'use client';

import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  /** Valor numérico final. */
  value: number;
  /** Decimales a mostrar (default 0). */
  decimals?: number;
  /** Override de className para el span animado. */
  className?: string;
}

/**
 * Cuenta desde 0 hasta `value` con spring physics. Usa Framer Motion
 * que ya está en el proyecto (sin dependencias nuevas).
 *
 * Respeta prefers-reduced-motion: si está activo, muestra el valor directo.
 */
export function AnimatedNumber({ value, decimals = 0, className }: Props) {
  const spring = useSpring(0, { stiffness: 80, damping: 22, mass: 1 });
  const display = useTransform(spring, (v) => {
    if (decimals === 0) return Math.round(v).toLocaleString();
    return v.toFixed(decimals);
  });

  useEffect(() => {
    // prefers-reduced-motion: saltar la animación
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
