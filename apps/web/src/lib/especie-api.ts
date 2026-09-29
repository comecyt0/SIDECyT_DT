/**
 * E52 — Descargas de archivos de clubes (con sesión: nunca enlaces directos). El nombre del archivo se limpia antes de
 * usarlo en el atributo `download`.
 */
import api from '@/lib/api';

function guardarBlob(data: BlobPart, nombre: string) {
  const url = URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre.replace(/[^\p{L}\p{N} ._()-]/gu, '_').slice(0, 120) || 'documento';
  a.click();
  URL.revokeObjectURL(url);
}

/** Documento subido de un club (dueño o personal con alcance; el servidor decide). */
export async function descargarDocumentoClub(clubId: number, clave: string, nombre: string) {
  const r = await api.get(`/clubes/${clubId}/documentos/${encodeURIComponent(clave)}`, { responseType: 'blob' });
  guardarBlob(r.data, nombre);
}

/** Carta de consentimiento generada para que la escuela la firme y selle (solo el líder del club). */
export async function descargarCartaEscuela(clubId: number, folio: string) {
  const r = await api.get(`/club/clubes/${clubId}/carta-escuela`, { responseType: 'blob' });
  guardarBlob(r.data, `carta-escuela-${folio}.pdf`);
}
