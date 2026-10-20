/**
 * E81 (20/10/2026) — Exportación de folios (PDF o Excel; completo, parcial o individual). Descarga con sesión; el
 * nombre del archivo se limpia antes de usarlo.
 */
import api from '@/lib/api';

export interface ParamsExportacion {
  formato: 'pdf' | 'xlsx';
  modo: 'completo' | 'parcial' | 'individual';
  ids?: string[];
  grupo?: string;
  convocatoria_id?: string;
  periodo_id?: string;
  escuela_id?: string;
  search?: string;
}

export async function descargarExportacionFolios(p: ParamsExportacion, nombre: string) {
  const r = await api.get('/admin/folios/exportar', { params: p, responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([r.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre.replace(/[^\p{L}\p{N} ._()-]/gu, '_').slice(0, 100) || 'folios'}.${p.formato}`;
  a.click();
  URL.revokeObjectURL(url);
}
