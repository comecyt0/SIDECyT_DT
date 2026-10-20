'use client';

import { useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import type { ResumenKit } from '@/lib/especie';

/**
 * E86 (20/10/2026, pedido del usuario) — Qué kit le toca al club: «Kit Nueva escuela» (uno por integrante) o «Kit»
 * (escuelas que ya participaron), cuántos y qué incluye. El personal con permiso puede cambiar el perfil del club.
 */
export default function TarjetaKit({ kit, onCambiarPerfil }: {
  kit: ResumenKit;
  /** Solo personal: 'auto' vuelve a la marca de la escuela. */
  onCambiarPerfil?: (perfil: 'auto' | 'nueva' | 'participo') => Promise<void>;
}) {
  const [guardando, setGuardando] = useState(false);
  // 20/10/2026: nacional e internacional, sin kit.
  if (!kit.aplica) return null;
  const tono = kit.perfil === 'nueva' ? 'mint' : kit.perfil === 'participo' ? 'gold' : 'neutral';
  return (
    <section className="app-card space-y-3 p-5" aria-labelledby="tarjeta-kit">
      <h2 id="tarjeta-kit" className="flex flex-wrap items-center gap-2 text-base font-bold text-[var(--app-ink)]">
        <Package className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Kit
        <span className="pill" data-tone={tono}>{kit.etiqueta} × {kit.cantidad}</span>
        {kit.forzado && <span className="pill" data-tone="neutral">Asignado por el COMECYT</span>}
      </h2>
      <p className="text-sm text-[var(--app-ink)]">
        <strong>{kit.nombre}</strong> · {kit.cantidad} kit{kit.cantidad === 1 ? '' : 's'}{kit.por === 'integrante' ? ' (uno por integrante)' : ' para el club'}
      </p>
      {kit.articulos.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Cada kit incluye</p>
          <ul className="mt-1 grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm text-[var(--app-ink)] sm:grid-cols-2">
            {kit.articulos.map((a, i) => <li key={i}><span className="font-semibold tabular-nums">{a.cantidad} ×</span> {a.articulo}</li>)}
          </ul>
        </div>
      ) : kit.descripcion ? <p className="whitespace-pre-wrap break-words text-sm text-[var(--app-ink-2)]">{kit.descripcion}</p> : null}
      {onCambiarPerfil && kit.diferenciado && (
        <label className="flex flex-wrap items-center gap-2 text-sm text-[var(--app-ink)]">
          <span className="font-semibold">Perfil de kit de este club</span>
          <select className="h-10" disabled={guardando} value={kit.forzado ? (kit.perfil ?? 'auto') : 'auto'}
            onChange={async (e) => { setGuardando(true); try { await onCambiarPerfil(e.target.value as 'auto' | 'nueva' | 'participo'); } finally { setGuardando(false); } }}>
            <option value="auto">Según la escuela ({kit.forzado ? 'quitar el cambio' : kit.etiqueta})</option>
            <option value="nueva">Kit Nueva escuela (uno por integrante)</option>
            <option value="participo">Kit (escuela que ya participó)</option>
          </select>
          {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-label="Guardando" />}
        </label>
      )}
    </section>
  );
}
