'use client';

import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';

export const MAX_TEMPORADAS = 20;

/** Lista de temporadas sin vacíos ni repetidas (igual que `Escuela::normalizarTemporadas` del backend). */
export function normalizarTemporadas(lista: unknown): string[] {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const t of lista) {
    const s = typeof t === 'string' ? t.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    if (!s || vistas.has(s.toLowerCase())) continue;
    vistas.add(s.toLowerCase());
    out.push(s);
    if (out.length >= MAX_TEMPORADAS) break;
  }
  return out;
}

/**
 * E55 — Temporadas en las que la escuela ya participó: el admin las escribe (p. ej. «2024», «Temporada 2025-2026») y
 * quedan como etiquetas. Enter o «Agregar» añade; la X quita.
 */
export default function TemporadasInput({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string | null }) {
  const [texto, setTexto] = useState('');
  const id = useId();
  const agregar = () => {
    const nueva = normalizarTemporadas([...value, texto]);
    if (nueva.length !== value.length) onChange(nueva);
    setTexto('');
  };
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Temporadas en que participó <Asterisco /></label>
      <div className="flex gap-2">
        <input id={id} className="auth-input auth-input-static pl-4" maxLength={60} placeholder="Ej. Temporada 2025-2026" value={texto}
          onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
          aria-invalid={error ? 'true' : undefined} disabled={value.length >= MAX_TEMPORADAS} />
        <Button type="button" variant="outline" onClick={agregar} disabled={!texto.trim() || value.length >= MAX_TEMPORADAS}><Plus className="h-4 w-4" aria-hidden="true" />Agregar</Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Temporadas agregadas">
          {value.map((t) => (
            <li key={t} className="pill inline-flex items-center gap-1" data-tone="gold">
              {t}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Quitar la temporada ${t}`} className="rounded-full p-0.5 hover:bg-black/10">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{error}</p>}
    </div>
  );
}
