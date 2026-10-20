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

/** 02/10/2026 — Archivo como Blob + tipo, para la vista previa dentro de la página (`useVistaPrevia().ver`). */
export async function archivoDocumentoClub(clubId: number, clave: string) {
  const r = await api.get(`/clubes/${clubId}/documentos/${encodeURIComponent(clave)}`, { responseType: 'blob' });
  return { data: r.data as BlobPart, tipo: String(r.headers?.['content-type'] ?? '') };
}
export async function archivoFirmado(clubId: number, firmadoId: number) {
  const r = await api.get(`/clubes/${clubId}/firmados/${firmadoId}`, { responseType: 'blob' });
  return { data: r.data as BlobPart, tipo: String(r.headers?.['content-type'] ?? '') };
}

/** Documento subido de un club (dueño o personal con alcance; el servidor decide). */
export async function descargarDocumentoClub(clubId: number, clave: string, nombre: string) {
  const r = await api.get(`/clubes/${clubId}/documentos/${encodeURIComponent(clave)}`, { responseType: 'blob' });
  guardarBlob(r.data, nombre);
}

/** E52 · F3: versión de un documento firmado (carta de resguardo o formato), para el líder dueño o el personal. */
export async function descargarFirmado(clubId: number, firmadoId: number, nombre: string) {
  const r = await api.get(`/clubes/${clubId}/firmados/${firmadoId}`, { responseType: 'blob' });
  guardarBlob(r.data, nombre);
}

/** E52 · F3: formato de solicitud de transporte y box lunch para firmar (solo el líder). */
export async function descargarFormatoLogistica(clubId: number, logisticaId: number, folio: string) {
  const r = await api.get(`/club/clubes/${clubId}/logistica/${logisticaId}/formato`, { responseType: 'blob' });
  guardarBlob(r.data, `solicitud-transporte-lunch-${folio}.pdf`);
}

/** E52 · F3: carta de resguardo del kit para firmar (solo el líder de un club aceptado). */
export async function descargarResguardo(clubId: number, folio: string) {
  const r = await api.get(`/club/clubes/${clubId}/resguardo`, { responseType: 'blob' });
  guardarBlob(r.data, `carta-resguardo-${folio}.pdf`);
}

/** E52 · F4: credencial del club con su QR (solo el líder, con el QR habilitado). */
export async function descargarCredencial(clubId: number, folio: string) {
  const r = await api.get(`/club/clubes/${clubId}/credencial`, { responseType: 'blob' });
  guardarBlob(r.data, `credencial-${folio}.pdf`);
}

/** E52 · F4: imagen del QR como URL de objeto (el llamador la revoca al desmontar). */
export async function urlImagenQr(clubId: number): Promise<string> {
  const r = await api.get(`/club/clubes/${clubId}/qr`, { responseType: 'blob' });
  return URL.createObjectURL(new Blob([r.data], { type: 'image/png' }));
}

/** E52 · F4: Excel de la convocatoria (admin y admin de convocatoria). */
export async function descargarReporteClubes(convocatoriaId: number) {
  const r = await api.get(`/revision/convocatorias/${convocatoriaId}/reporte`, { responseType: 'blob' });
  guardarBlob(r.data, `reporte-clubes-${convocatoriaId}-${new Date().toISOString().split('T')[0]}.xlsx`);
}

/** E79: formato institucional lleno y sin edición (carta, A, B o C) para firmar y subir. */
export async function descargarFormatoClub(clubId: number, formato: string, folio: string) {
  const r = await api.get(`/club/clubes/${clubId}/formatos/${encodeURIComponent(formato)}`, { responseType: 'blob' });
  guardarBlob(r.data, `${formato.replace(/_/g, '-')}-${folio}.pdf`);
}

/** E79: permiso de uso de imagen de un integrante (infantil o de adulto, lo decide el servidor). */
export async function descargarUsoImagen(clubId: number, integranteId: number, folio: string) {
  const r = await api.get(`/club/clubes/${clubId}/integrantes/${integranteId}/uso-imagen`, { responseType: 'blob' });
  guardarBlob(r.data, `permiso-uso-de-imagen-${folio}-${integranteId}.pdf`);
}

/** E92: permiso de uso de imagen prellenado con los datos del NUEVO integrante de una solicitud de cambio. */
export async function descargarPermisoNuevo(clubId: number, datos: Record<string, unknown>, folio: string) {
  const r = await api.post(`/club/clubes/${clubId}/cambios-integrante/permiso-previo`, datos, { responseType: 'blob' });
  guardarBlob(r.data, `permiso-uso-de-imagen-${folio}-nuevo.pdf`);
}

/** E92: foto o permiso del nuevo integrante de una solicitud de cambio (vista previa dentro de la página). */
export async function archivoCambio(clubId: number, cambioId: number, tipo: 'foto' | 'permiso') {
  const r = await api.get(`/clubes/${clubId}/cambios-integrante/${cambioId}/${tipo}`, { responseType: 'blob' });
  return { data: r.data as BlobPart, tipo: tipo === 'foto' ? 'image/webp' : 'application/pdf' };
}

/** Carta de consentimiento generada para que la escuela la firme y selle (solo el líder del club). */
export async function descargarCartaEscuela(clubId: number, folio: string) {
  const r = await api.get(`/club/clubes/${clubId}/carta-escuela`, { responseType: 'blob' });
  guardarBlob(r.data, `carta-escuela-${folio}.pdf`);
}
