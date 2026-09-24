'use client';

/**
 * E45 (punto 6) — Selector de tipos de archivo y tamaño máximo para un campo de subida. Mismos tipos que el backend
 * (App\Support\TiposArchivo): pdf | imagen | office | zip, tamaño 1–20 MB.
 */
export const TIPOS_ARCHIVO = [
  { key: 'pdf', label: 'PDF' },
  { key: 'imagen', label: 'Imagen (JPG, PNG, WebP)' },
  { key: 'office', label: 'Word / Excel (DOCX, XLSX)' },
  { key: 'zip', label: 'ZIP' },
] as const;
export const TAMANO_MAX_MB = 20;

export function normalizarFormatos(v: string | string[] | null | undefined): string[] {
  const lista = (Array.isArray(v) ? v : String(v ?? '').split(','))
    .map((x) => x.trim().toLowerCase())
    .filter((x) => TIPOS_ARCHIVO.some((t) => t.key === x));
  return lista.length ? Array.from(new Set(lista)) : ['pdf'];
}

export default function SelectorFormatos({
  formatos,
  tamano,
  onChange,
  idBase,
}: {
  formatos: string[];
  tamano: number;
  onChange: (formatos: string[], tamano: number) => void;
  idBase: string;
}) {
  const alternar = (k: string) => {
    const set = new Set(formatos);
    if (set.has(k)) set.delete(k); else set.add(k);
    const lista = TIPOS_ARCHIVO.map((t) => t.key).filter((x) => set.has(x));
    onChange(lista.length ? lista : ['pdf'], tamano);
  };
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-[var(--app-ink)]">Tipos permitidos</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS_ARCHIVO.map((t) => (
            <label key={t.key} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--sg-canvas,#f6f8fb)] px-3 py-1.5 text-xs font-semibold text-[var(--app-ink)]">
              <input type="checkbox" checked={formatos.includes(t.key)} onChange={() => alternar(t.key)} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${idBase}-mb`} className="block text-xs font-semibold text-[var(--app-ink)]">
        Tamaño máximo: <strong>{tamano} MB</strong>
      </label>
      <input id={`${idBase}-mb`} type="range" min={1} max={TAMANO_MAX_MB} step={1} value={tamano}
        onChange={(e) => onChange(formatos, Number(e.target.value))} className="w-full accent-[var(--sg-vino,#7a2748)]" />
    </div>
  );
}
