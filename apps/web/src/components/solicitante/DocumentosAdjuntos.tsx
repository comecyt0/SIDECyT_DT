'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Check, Loader2, Download, Trash2, Eye, X } from 'lucide-react';
import api from '@/lib/api';
import { colorMap } from '@/lib/color-mapper';

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

  const getAbsoluteUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    // Storage files are at /storage/..., not /api/storage/...
    // Remove /api from the base URL if URL starts with /storage/
    if (url.startsWith('/storage/')) {
      const baseUrl = apiUrl.replace('/api', '');
      return `${baseUrl}${url}`;
    }

    return `${apiUrl}${url}`;
  };

  const documentosPorClave = Object.fromEntries(
    tiposDocumento.map(tipo => [
      tipo.clave,
      documentos.find(d => d.tipo === tipo.clave)
    ])
  );

  const handleFileSelect = async (clave: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setFeedback({ type: 'error', message: 'Solo se permiten archivos PDF.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'El archivo no debe superar los 5MB.' });
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
      title: 'Eliminar Documento',
      description: '¿Deseas eliminar este documento?',
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
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Documentos Adjuntos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Documentos Adjuntos
        </CardTitle>
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
            message="No hay documentos requeridos para este programa."
          />
        ) : (
          <>
            {documentosFaltantes.length > 0 && !readonly && (
              <AlertBox
                type="warning"
                title="Documentos Requeridos"
                message={`Faltan por subir: ${documentosFaltantes.map(d => d.nombre).join(', ')}`}
              />
            )}

            <div className="space-y-3">
              {tiposDocumento.map((tipo) => {
            const doc = documentosPorClave[tipo.clave];
            const isUploading = uploading === tipo.clave;

            return (
              <div
                key={tipo.clave}
                className={`p-4 border rounded-lg transition ${
                  doc
                    ? 'border-green-200 bg-green-50'
                    : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-neutral-900">{tipo.nombre}</p>
                      {tipo.obligatorio && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Requerido
                        </Badge>
                      )}
                      {doc && (
                        <Badge variant="outline" className={`${colorMap.states.success.background} ${colorMap.states.success.text} border-green-200`}>
                          <Check className="h-3 w-3 mr-1" />
                          Subido
                        </Badge>
                      )}
                    </div>
                    {tipo.descripcion && (
                      <p className="text-xs text-neutral-500 mt-1">{tipo.descripcion}</p>
                    )}
                    {doc && (
                      <p className="text-sm text-neutral-600 mt-1">
                        {doc.nombre_original} • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {doc ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => setPreviewingDoc(doc)}
                          title="Vista previa del documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <a href={getAbsoluteUrl(doc.url)} target="_blank" rel="noopener noreferrer">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Descargar documento"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        {!readonly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteLoading === doc.id}
                            onClick={() => handleDelete(doc.id)}
                            title="Eliminar documento"
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
                          accept=".pdf"
                          onChange={(e) => handleFileSelect(tipo.clave, e)}
                          disabled={isUploading}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          className="cursor-pointer gap-2"
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

            <div className="text-sm text-neutral-600 space-y-1 pt-2 border-t">
              <p>📄 <strong>Formato:</strong> Solo PDF</p>
              <p>💾 <strong>Tamaño máximo:</strong> 5 MB</p>
              {tiposDocumento.length > 0 && (
                <p>✅ <strong>Requeridos:</strong> {tiposDocumento.filter(t => t.obligatorio).map(t => t.nombre).join(', ')}</p>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Preview Modal */}
      <Dialog open={!!previewingDoc} onOpenChange={(open) => !open && setPreviewingDoc(null)}>
        <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between">
            <DialogTitle>{previewingDoc?.nombre_original || 'Vista Previa del Documento'}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setPreviewingDoc(null)}
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
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
