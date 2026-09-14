'use client';

import { useState } from 'react';
import { Star, Trash2, Loader2, Filter } from 'lucide-react';
import { useSavedFilters, type SavedFilter } from '@/hooks/useSavedFilters';

interface SavedFiltersBarProps<TFiltros> {
  /** Identificador único del scope (p.ej. 'admin.solicitudes') */
  scope: string;
  /** Filtros actuales seleccionados por el usuario */
  currentFilters: TFiltros;
  /** Callback cuando el usuario carga un filtro guardado */
  onApply: (filtros: TFiltros) => void;
}

export default function SavedFiltersBar<TFiltros extends Record<string, unknown>>({
  scope,
  currentFilters,
  onApply,
}: SavedFiltersBarProps<TFiltros>) {
  const { items, loading, save, remove } = useSavedFilters<TFiltros>(scope);
  const [showInput, setShowInput] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await save(nombre.trim(), currentFilters);
      setNombre('');
      setShowInput(false);
    } catch {
      // El componente padre puede mostrar toast; aquí silencioso
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-widest">
        <Filter className="w-3 h-3" />
        Mis filtros
      </span>

      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-300 dark:text-neutral-500" />}

      {!loading &&
        items.map((f: SavedFilter<TFiltros>) => (
          <span key={f.id} className="inline-flex items-center gap-1 bg-primary/[8%] text-primary px-2.5 py-1 rounded-full font-semibold">
            {f.predeterminado && <Star className="w-3 h-3 fill-current" />}
            <button
              type="button"
              onClick={() => onApply(f.filtros)}
              className="hover:underline"
              title="Aplicar este filtro"
            >
              {f.nombre}
            </button>
            <button
              type="button"
              onClick={() => remove(f.id)}
              className="text-neutral-500 dark:text-neutral-300 hover:text-red-500 transition-colors"
              title="Eliminar filtro"
              aria-label={`Eliminar filtro ${f.nombre}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}

      {!loading && !showInput && (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 hover:text-primary uppercase tracking-wider"
        >
          + guardar filtro actual
        </button>
      )}

      {showInput && (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setShowInput(false);
                setNombre('');
              }
            }}
            placeholder="Nombre del filtro…"
            className="px-2 py-1 rounded-md text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 outline-none focus:border-primary/40"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !nombre.trim()}
            className="text-[10px] font-bold text-white bg-primary hover:bg-[var(--brand-vino-700)] px-2 py-1 rounded-md disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowInput(false);
              setNombre('');
            }}
            className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 hover:text-primary"
          >
            cancelar
          </button>
        </span>
      )}
    </div>
  );
}
