'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * 02/10/2026 — Interruptor de modo claro / oscuro en el encabezado de todos los paneles (pedido del usuario: «como
 * switch»). `role="switch"` con `aria-checked` = oscuro; se maneja con teclado (Espacio/Enter) y guarda la elección.
 */
export default function ThemeSwitch() {
  const { isDark, setMode } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  if (!montado) return <span className="inline-block h-8 w-[58px]" aria-hidden="true" />;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Modo oscuro"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      className="tema-switch"
      data-oscuro={isDark ? '' : undefined}
    >
      <span className="tema-switch-icono" aria-hidden="true"><Sun /></span>
      <span className="tema-switch-icono" aria-hidden="true"><Moon /></span>
      <span className="tema-switch-perilla" aria-hidden="true">{isDark ? <Moon /> : <Sun />}</span>
    </button>
  );
}
