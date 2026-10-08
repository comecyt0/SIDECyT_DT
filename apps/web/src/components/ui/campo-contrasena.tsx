'use client';

import { useId, useState } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { fuerzaPassword, requisitosPassword } from '@/lib/password-policy';

/**
 * 08/10/2026 (pedido del usuario) — Botón de ojo para ver la contraseña y semáforo de qué tan segura es al crearla.
 * `BotonVerContrasena` va dentro del contenedor `relative` del campo; `SemaforoContrasena` debajo del campo nuevo
 * (no en la confirmación). Colores: rojo débil, amarillo regular, verde segura.
 */
export function BotonVerContrasena({ visible, onToggle, etiqueta = 'contraseña' }: { visible: boolean; onToggle: () => void; etiqueta?: string }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={visible} aria-label={visible ? `Ocultar ${etiqueta}` : `Mostrar ${etiqueta}`}
      title={visible ? 'Ocultar' : 'Mostrar'}
      className="absolute right-2 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--app-ink-2,var(--auth-ink-2))] transition-transform duration-150 hover:bg-[color-mix(in_oklch,currentColor_10%,transparent)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2">
      {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

const NIVEL = [
  { texto: '', color: 'transparent', luces: 0 },
  { texto: 'Débil', color: 'var(--destructive)', luces: 1 },
  { texto: 'Regular', color: 'var(--tile-gold-fg)', luces: 2 },
  { texto: 'Segura', color: 'var(--tile-emerald-fg)', luces: 3 },
  { texto: 'Muy segura', color: 'var(--tile-emerald-fg)', luces: 3 },
] as const;

export function SemaforoContrasena({ valor }: { valor: string }) {
  const id = useId();
  const nivel = fuerzaPassword(valor);
  const n = NIVEL[nivel];
  const luces = ['var(--destructive)', 'var(--tile-gold-fg)', 'var(--tile-emerald-fg)'];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {luces.map((c, i) => (
            <span key={c} className="h-1.5 flex-1 rounded-full transition-colors duration-200"
              style={{ background: i < n.luces ? luces[n.luces - 1] : 'color-mix(in oklch, currentColor 14%, transparent)' }} />
          ))}
        </div>
        <span id={id} role="status" aria-live="polite" className="min-w-[5.5rem] text-right text-xs font-bold" style={{ color: n.color }}>
          {nivel ? `Seguridad: ${n.texto}` : ''}
        </span>
      </div>
      {valor && (
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          {requisitosPassword(valor).map((r) => (
            <li key={r.texto} className="inline-flex items-center gap-1" style={{ color: r.ok ? 'var(--tile-emerald-fg)' : 'var(--app-ink-2,var(--auth-ink-2))' }}>
              {r.ok ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
              <span>{r.texto}<span className="sr-only">{r.ok ? ': cumple' : ': falta'}</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Estado de visibilidad para un campo (atajo). */
export function useVerContrasena() {
  const [visible, setVisible] = useState(false);
  return { visible, alternar: () => setVisible((v) => !v), tipo: visible ? 'text' : 'password' } as const;
}
