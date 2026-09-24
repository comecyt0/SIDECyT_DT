/**
 * E45 (punto 6) — Límites de archivo en el navegador, espejo de App\Support\TiposArchivo del backend. Aquí solo se
 * AVISA antes de subir (accept, tamaño, extensión); el servidor revisa el contenido real y decide.
 */
const POR_TIPO: Record<string, { ext: string[]; mime: string[]; etiqueta: string }> = {
  pdf: { ext: ['.pdf'], mime: ['application/pdf'], etiqueta: 'PDF' },
  imagen: { ext: ['.jpg', '.jpeg', '.png', '.webp'], mime: ['image/jpeg', 'image/png', 'image/webp'], etiqueta: 'JPG, PNG o WebP' },
  office: { ext: ['.docx', '.xlsx'], mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], etiqueta: 'Word o Excel (DOCX, XLSX)' },
  zip: { ext: ['.zip'], mime: ['application/zip', 'application/x-zip-compressed'], etiqueta: 'ZIP' },
};

export function formatosDe(v: string | string[] | null | undefined): string[] {
  const lista = (Array.isArray(v) ? v : String(v ?? '').split(','))
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x in POR_TIPO);
  return lista.length ? Array.from(new Set(lista)) : ['pdf'];
}

/** Valor para el atributo `accept` de un <input type="file">. */
export function acceptDe(formatos: string[]): string {
  return formatos.flatMap((f) => [...(POR_TIPO[f]?.ext ?? []), ...(POR_TIPO[f]?.mime ?? [])]).join(',');
}

/** "PDF o JPG, PNG o WebP · hasta 5 MB" */
export function describirLimites(formatos: string[], mb: number): string {
  return `${formatos.map((f) => POR_TIPO[f]?.etiqueta ?? f).join(' o ')} · hasta ${mb} MB`;
}

/** Devuelve el problema en español o null si el archivo cumple (por extensión y tamaño). */
export function validarArchivo(file: File, formatos: string[], mb: number): string | null {
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > mb * 1024 * 1024) return `El archivo pesa más de ${mb} MB, el máximo para este documento.`;
  const nombre = file.name.toLowerCase();
  const ok = formatos.some((f) => (POR_TIPO[f]?.ext ?? []).some((e) => nombre.endsWith(e)));
  return ok ? null : `Tipo no permitido. Se acepta: ${formatos.map((f) => POR_TIPO[f]?.etiqueta ?? f).join(', ')}.`;
}
