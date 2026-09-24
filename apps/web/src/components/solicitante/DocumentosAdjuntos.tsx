'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Check, Loader2, Download, Trash2, Eye, X, FileText, HardDrive, CheckCircle2, Paperclip } from 'lucide-react';
import api from '@/lib/api';
import { safeUrl } from '@/lib/safe-url';
import { acceptDe, describirLimites, formatosDe, validarArchivo } from '@/lib/archivos';

export interface Documento {
  id: number;
  solicitud_id: number;
  tipo: string;
  nombre_original: string;
  url: string;
  created_at: string;
}

interface TipoDocumento {
  id: number;
  nombre: string;
  clave: string;
  obligatorio: boolean;
  descripcion?: string;
  orden: number;
  // E45 (punto 6): límites que definió el admin para este documento.
  formato_permitido?: string | null;
  tamaño_maximo_mb?: number | null;
}

interface DocumentosAdjuntosProps {
  solicitudId: number;
  tipoProgramaId: number;
  documentos?: Documento[];
  onUpload?: () => void;
  readonly?: boolean;
}

export function DocumentosAdjuntos({
  solicitudId,
  tipoProgramaId,
  documentos = [],
  onUpload,
  readonly = false,
}: DocumentosAdjuntosProps) {
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewingDoc, setPreviewingDoc] = useState<Documento | null>(null);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; description: string; onConfirm: () => void}>({
    open: false, title: '', description: '', onConfirm: () => {}
  });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Cargar tipos de documentos del programa
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/catalogs/programa/${tipoProgramaId}/documentos`);
        // El endpoint retorna { message: "OK", data: [...], count: ... }
        const tipos = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];
        setTiposDocumento(tipos);
      } catch (error) {
        console.error('Error loading document types:', error);
        setTiposDocumento([]);
      } finally {
        setLoading(false);
      }
    };
    if (tipoProgramaId) {
      init();
    }
  }, [tipoProgramaId]);

  // SEGURIDAD (24/09/2026): los documentos se descargan por /api/archivos/... (privado, con sesión). safeUrl solo
  // acepta rutas del propio sitio: un valor raro de la API (p. ej. `javascript:`) no llega a href/src.
  const getAbsoluteUrl = (url: string) => safeUrl(url) ?? '#';

  const documentosPorClave = Object.fromEntries(
    tiposDocumento.map(tipo => [
      tipo.clave,
      documentos.find(d => d.tipo === tipo.clave)
    ])
  );

  const handleFileSelect = async (clave: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // E45: tipos y tamaño del documento según lo configurado por el admin (el servidor revisa el contenido real).
    const tipoDoc = tiposDocumento.find((t) => t.clave === clave);
    const problema = validarArchivo(file, formatosDe(tipoDoc?.formato_permitido), Number(tipoDoc?.['tamaño_maximo_mb'] ?? 5) || 5);
    if (problema) {
      setFeedback({ type: 'error', message: problema });
      event.target.value = '';
      return;
    }

    setUploading(clave);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', clave);

      await api.post(`/solicitudes/${solicitudId}/documentos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Reset input
      event.target.value = '';

      // Callback para recargar datos
      if (onUpload) {
        onUpload();
      } else {
        setFeedback({ type: 'success', message: 'Documento subido exitosamente.' });
      }
    } catch (error: any) {
      console.error('Error al subir documento:', error);
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Error al subir el documento' });
      event.target.value = '';
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = (docId: number) => {
    setConfirmState({
      open: true,
      title: 'Quitar el documento',
      description: '¿Quieres quitar este documento? Después podrás subir otro en su lugar.',
      onConfirm: async () => {
        setDeleteLoading(docId);
        try {
          await api.delete(`/solicitudes/${solicitudId}/documentos/${docId}`);
          if (onUpload) {
            onUpload();
          } else {
            setFeedback({ type: 'success', message: 'Documento eliminado exitosamente.' });
          }
        } catch (error: any) {
          console.error('Error al eliminar:', error);
          setFeedback({ type: 'error', message: error.response?.data?.error || 'Error al eliminar documento' });
        } finally {
          setDeleteLoading(null);
        }
      },
    });
  };

  const documentosFaltantes = tiposDocumento.filter(
    tipo => tipo.obligatorio && !documentosPorClave[tipo.clave]
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Paperclip className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Documentos de la solicitud
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--auth-vino)' }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Paperclip className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
          Documentos de la solicitud
        </CardTitle>
        <CardDescription>
          {readonly ? 'Estos son los documentos que acompañan tu solicitud.' : 'Sube en PDF cada documento que pide la convocatoria. Puedes verlos, descargarlos o quitarlos.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          description={confirmState.description}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({...s, open: false})); }}
          onCancel={() => setConfirmState(s => ({...s, open: false}))}
          variant="destructive"
        />
        {tiposDocumento.length === 0 ? (
          <AlertBox
            type="info"
            title="Documentos"
            message="Esta convocatoria no pide documentos adicionales."
          />
        ) : (
          <>
            {documentosFaltantes.length > 0 && !readonly && (
              <AlertBox
                type="warning"
                title="Documentos que faltan"
                message={`Todavía falta subir: ${documentosFaltantes.map(d => d.nombre).join(', ')}.`}
              />
            )}

            <div className="space-y-3">
              {tiposDocumento.map((tipo) => {
            const doc = documentosPorClave[tipo.clave];
            const isUploading = uploading === tipo.clave;

            return (
              <div
                key={tipo.clave}
                className={`p-4 rounded-[16px] border border-[var(--app-rule)] transition-colors ${doc ? '' : 'bg-[var(--auth-field)]'}`}
                style={doc ? { backgroundColor: 'var(--tile-emerald-bg)' } : undefined}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--app-ink)]">{tipo.nombre}</p>
                      {tipo.obligatorio && (
                        <span className="inline-flex h-5 items-center rounded-md px-2 text-[11px] font-semibold" style={{ backgroundColor: 'var(--tile-gold-bg)', color: 'var(--tile-gold-fg)' }}>
                          Obligatorio
                        </span>
                      )}
                      {doc && (
                        <span className="inline-flex h-5 items-center gap-1 rounded-md px-2 text-[11px] font-semibold" style={{ backgroundColor: 'var(--tile-emerald-bg)', color: 'var(--tile-emerald-fg)' }}>
                          <Check className="h-3 w-3" aria-hidden="true" />
                          Subido
                        </span>
                      )}
                    </div>
                    {tipo.descripcion && (
                      <p className="text-xs text-[var(--app-ink-2)] mt-1">{tipo.descripcion}</p>
                    )}
                    {doc && (
                      <p className="text-sm text-[var(--app-ink-2)] mt-1 break-all">
                        {doc.nombre_original} · {new Date(doc.created_at).toLocaleDateString('es-MX')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc ? (
                      <>
                        <Button
                          variant="soft"
                          size="icon-sm"
                          onClick={() => setPreviewingDoc(doc)}
                          title="Ver el documento"
                          aria-label="Ver el documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <a href={getAbsoluteUrl(doc.url)} target="_blank" rel="noopener noreferrer">
                          <Button
                            variant="soft"
                            size="icon-sm"
                            title="Descargar el documento"
                            aria-label="Descargar el documento"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        {!readonly && (
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            disabled={deleteLoading === doc.id}
                            onClick={() => handleDelete(doc.id)}
                            title="Quitar el documento"
                            aria-label="Quitar el documento"
                          >
                            {deleteLoading === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </>
                    ) : !readonly ? (
                      <>
                        <input
                          ref={(el) => {
                            if (el) fileInputRefs.current[tipo.clave] = el;
                          }}
                          type="file"
                          accept={acceptDe(formatosDe(tipo.formato_permitido))}
                          title={describirLimites(formatosDe(tipo.formato_permitido), Number(tipo['tamaño_maximo_mb'] ?? 5) || 5)}
                          onChange={(e) => handleFileSelect(tipo.clave, e)}
                          disabled={isUploading}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          disabled={isUploading}
                          type="button"
                          onClick={() => {
                            const input = fileInputRefs.current[tipo.clave];
                            if (input) input.click();
                          }}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {isUploading ? 'Subiendo...' : 'Subir PDF'}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
              })}
            </div>

            <div className="text-sm text-[var(--app-ink-2)] space-y-1 pt-3 border-t border-[var(--app-rule)]">
              <p className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> <strong className="text-[var(--app-ink)]">Formato:</strong> solo PDF</p>
              <p className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> <strong className="text-[var(--app-ink)]">Tamaño máximo:</strong> 5 MB</p>
              {tiposDocumento.length > 0 && (
                <p className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" style={{ color: 'var(--tile-emerald-fg)' }} /> <span><strong className="text-[var(--app-ink)]">Obligatorios:</strong> {tiposDocumento.filter(t => t.obligatorio).map(t => t.nombre).join(', ')}</span></p>
              )}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={!!previewingDoc} onOpenChange={(open) => !open && setPreviewingDoc(null)}>
        <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-[var(--app-rule)] flex-row items-center justify-between">
            <DialogTitle className="truncate">{previewingDoc?.nombre_original || 'Vista previa del documento'}</DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPreviewingDoc(null)}
              aria-label="Cerrar la vista previa"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewingDoc && (
              <iframe
                src={getAbsoluteUrl(previewingDoc.url)}
                className="w-full h-full"
                title={previewingDoc.nombre_original}
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
