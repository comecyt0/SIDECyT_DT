'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Images,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
  ExternalLink,
  UploadCloud,
  X,
  Link2,
} from 'lucide-react';
import api from '@/lib/api';
import { INSTITUTION } from '@/lib/institution';

export interface CarouselSlide {
  id: number;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  imagen_url?: string;
  badge_texto?: string;
  orden: number;
  activo: boolean;
}

interface Props {
  slides: CarouselSlide[];
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 8;

const emptyForm = (): Omit<CarouselSlide, 'id'> => ({
  titulo: '',
  subtitulo: '',
  descripcion: '',
  imagen_url: '',
  badge_texto: '',
  orden: 0,
  activo: true,
});

export default function CarruselClient({ slides }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null);
  const [form, setForm] = useState(emptyForm());

  // Subida de imagen local (14/09/2026): POST /admin/carousel/upload → /storage/carousel/<hash>.<ext>
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<CarouselSlide | null>(null);
  const [, setDeleting] = useState(false);

  const [previewSlide, setPreviewSlide] = useState<CarouselSlide | null>(null);

  const openCreate = () => {
    setEditingSlide(null);
    setForm(emptyForm());
    setError('');
    setSuccess('');
    setUploadError('');
    setShowModal(true);
  };

  const openEdit = (slide: CarouselSlide) => {
    setEditingSlide(slide);
    setForm({
      titulo: slide.titulo,
      subtitulo: slide.subtitulo || '',
      descripcion: slide.descripcion || '',
      imagen_url: slide.imagen_url || '',
      badge_texto: slide.badge_texto || '',
      orden: slide.orden,
      activo: slide.activo,
    });
    setError('');
    setSuccess('');
    setUploadError('');
    setShowModal(true);
  };

  const uploadFile = async (file: File) => {
    setUploadError('');
    if (!ACCEPTED.includes(file.type)) {
      setUploadError('Solo JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`La imagen pesa más de ${MAX_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      // Sin fijar Content-Type: axios lo omite para FormData y el navegador pone el boundary.
      const { data } = await api.post<{ imagen_url: string }>('/admin/carousel/upload', fd);
      setForm((f) => ({ ...f, imagen_url: data.imagen_url }));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errs = axiosErr.response?.data?.errors;
      setUploadError(errs ? Object.values(errs).flat().join(' · ') : axiosErr.response?.data?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingSlide) {
        await api.put(`/admin/carousel/${editingSlide.id}`, form);
        setSuccess('Slide actualizado correctamente.');
      } else {
        await api.post('/admin/carousel', form);
        setSuccess('Slide creado correctamente.');
      }

      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errs = axiosErr.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' · ') : axiosErr.response?.data?.message || 'Error al guardar el slide.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/carousel/${confirmDelete.id}`);
      setConfirmDelete(null);
      router.refresh();
    } catch {
      setError('Error al eliminar el slide.');
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActivo = async (slide: CarouselSlide) => {
    try {
      await api.put(`/admin/carousel/${slide.id}`, { ...slide, activo: !slide.activo });
      router.refresh();
    } catch {
      setError('Error al actualizar el estado del slide.');
    }
  };

  const fieldCls = 'auth-input auth-input-static pl-4';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,2.4vw,1.875rem)] font-bold tracking-tight text-[var(--app-ink)]">Carrusel de Login</h1>
          <p className="text-[var(--app-ink-2)] mt-1">
            Administra los slides que se muestran en la pantalla de inicio de sesión.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Slide
        </Button>
      </div>

      {error && !showModal && <AlertBox type="error" message={error} onClose={() => setError('')} />}

      <div className="app-card flex items-start gap-3 p-4 text-sm text-[var(--app-ink-2)]" style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
        <span className="app-tile-icon !w-9 !h-9 !rounded-lg shrink-0" style={{ color: 'var(--tile-gold-fg)' }}>
          <Images className="w-4 h-4" />
        </span>
        <div>
          <strong className="font-semibold text-[var(--app-ink)]">Así funciona:</strong> cada slide es una diapositiva de la pantalla de inicio de
          sesión; se muestran en el orden que indiques y solo las que estén activas. Puedes <strong>subir una foto desde tu equipo</strong>
          (JPG, PNG o WebP, hasta {MAX_MB} MB; funciona mejor en horizontal). Si no pones foto, se usa el fondo institucional.
        </div>
      </div>

      {/* Slides grid */}
      <div className="app-card overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--app-rule)' }}>
          <div>
            <p className="text-base font-bold text-[var(--app-ink)] flex items-center gap-2">
              <Images className="w-5 h-5 text-primary" />
              Slides <span className="text-[var(--app-ink-2)] font-normal text-sm">({slides.length})</span>
            </p>
            <p className="text-xs text-[var(--app-ink-2)] mt-0.5">Pasa el mouse sobre un slide para previsualizar, editar o eliminar.</p>
          </div>
        </div>
        <div className="p-6">
          {slides.length === 0 ? (
            <div className="text-center py-12 text-[var(--app-ink-2)]">
              <Images className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay slides. Crea el primero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  className={`group relative rounded-[18px] overflow-hidden border transition-all duration-200 ${
                    slide.activo ? 'shadow-md hover:shadow-lg hover:-translate-y-0.5' : 'opacity-60'
                  }`}
                  style={{ borderColor: slide.activo ? 'color-mix(in oklch, var(--auth-vino) 25%, var(--app-rule))' : 'var(--app-rule)' }}
                >
                  <div className="relative h-40 overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--auth-vino), var(--brand-vino-800))' }}>
                    {slide.imagen_url && (
                      <Image
                        src={slide.imagen_url}
                        alt={slide.titulo}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    <div className="absolute top-2 left-2 flex gap-2">
                      <Badge variant={slide.activo ? 'default' : 'secondary'} className={`text-xs ${slide.activo ? 'bg-emerald-600 text-white' : ''}`}>
                        {slide.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-black/30 text-white border-white/20">
                        Orden: {slide.orden}
                      </Badge>
                    </div>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button type="button" onClick={() => setPreviewSlide(slide)} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-all" title="Vista previa" aria-label="Vista previa">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => openEdit(slide)} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-all" title="Editar" aria-label="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(slide)} className="w-10 h-10 rounded-xl bg-red-500/40 hover:bg-red-500/70 backdrop-blur-sm flex items-center justify-center text-white transition-all" title="Eliminar" aria-label="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute bottom-2 left-3 right-3">
                      {slide.badge_texto && <span className="auth-tag text-[11px]">{slide.badge_texto}</span>}
                      <p className="text-white font-bold text-sm line-clamp-2 drop-shadow">{slide.titulo}</p>
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between gap-2" style={{ background: 'var(--app-card-bg)' }}>
                    <p className="text-xs text-[var(--app-ink-2)] line-clamp-1 flex-1">
                      {slide.subtitulo || slide.descripcion || 'Sin subtítulo'}
                    </p>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon-sm" onClick={() => toggleActivo(slide)} title={slide.activo ? 'Ocultar del login' : 'Mostrar en el login'} aria-label={slide.activo ? 'Ocultar del login' : 'Mostrar en el login'}>
                        {slide.activo ? <EyeOff /> : <Eye />}
                      </Button>
                      <Button variant="soft" size="icon-sm" onClick={() => openEdit(slide)} title="Editar" aria-label="Editar">
                        <Pencil />
                      </Button>
                      <Button variant="destructive" size="icon-sm" onClick={() => setConfirmDelete(slide)} title="Eliminar" aria-label="Eliminar">
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !saving && !uploading && setShowModal(open)}>
        <DialogContent className="sm:max-w-[560px] app-card p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]">
              <Images className="w-5 h-5 text-primary" />
              {editingSlide ? 'Editar slide' : 'Nuevo slide'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}
            {success && <AlertBox type="success" message={success} />}

            {!success && (
              <>
                {/* Imagen: zona de arrastrar/soltar + vista previa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Imagen del slide</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED.join(',')}
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadFile(f);
                      e.target.value = '';
                    }}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Subir imagen desde tu equipo"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    className="relative h-40 rounded-[var(--auth-radius-field)] border-2 border-dashed overflow-hidden cursor-pointer transition-colors outline-none focus-visible:ring-4"
                    style={{
                      borderColor: dragOver ? 'var(--auth-vino)' : 'var(--auth-rule-strong)',
                      background: dragOver ? 'var(--auth-vino-soft)' : 'var(--auth-field)',
                    }}
                  >
                    {form.imagen_url ? (
                      <>
                        <Image
                          src={form.imagen_url}
                          alt="Vista previa"
                          fill
                          unoptimized
                          sizes="560px"
                          className="object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <p className="absolute bottom-2 left-3 text-white text-sm font-bold drop-shadow">{form.titulo || 'Vista previa'}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setForm({ ...form, imagen_url: '' }); }}
                          aria-label="Quitar imagen"
                          className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <span className="absolute top-2 left-2 auth-tag text-[11px]">Clic para cambiar</span>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--app-ink-2)]">
                        {uploading ? (
                          <Loader2 className="w-7 h-7 animate-spin text-primary" />
                        ) : (
                          <UploadCloud className="w-7 h-7" style={{ color: 'var(--auth-vino)' }} />
                        )}
                        <p className="text-sm font-semibold text-[var(--app-ink)]">
                          {uploading ? 'Subiendo…' : 'Arrastra una imagen o haz clic para elegirla'}
                        </p>
                        <p className="text-xs">JPG, PNG o WebP · hasta {MAX_MB} MB</p>
                      </div>
                    )}
                    {uploading && form.imagen_url && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  {uploadError && <p className="text-xs" style={{ color: 'var(--auth-danger)' }}>{uploadError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label htmlFor="slide-titulo" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Título *</label>
                    <input id="slide-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Gestión de Proyectos Tecnológicos" className={fieldCls} />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="slide-subtitulo" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Subtítulo</label>
                    <input id="slide-subtitulo" value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} placeholder={`Ej: Plataforma ${INSTITUTION.name}`} className={fieldCls} />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="slide-badge" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Etiqueta</label>
                    <input id="slide-badge" value={form.badge_texto} onChange={(e) => setForm({ ...form, badge_texto: e.target.value })} placeholder="Ej: Desarrollo Tecnológico" className={fieldCls} />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label htmlFor="slide-desc" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Descripción</label>
                    <textarea
                      id="slide-desc"
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      placeholder="Breve descripción del slide (opcional)"
                      className="w-full px-4 py-3 rounded-[var(--auth-radius-field)] text-sm resize-none h-20 outline-none transition-colors"
                      style={{ border: '1.5px solid var(--auth-rule)', background: 'var(--auth-field)', color: 'var(--auth-ink)' }}
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label htmlFor="slide-url" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> O pega una URL de imagen
                      {form.imagen_url && form.imagen_url.startsWith('http') && (
                        <a href={form.imagen_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1" aria-label="Abrir imagen">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </label>
                    <input id="slide-url" value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} placeholder="https://…edomex.gob.mx/imagen.jpg" className={fieldCls} />
                    <p className="text-[11px] text-[var(--app-ink-2)]">
                      Si prefieres una imagen que ya está publicada en un sitio del Gobierno del Estado de México, pega aquí su dirección.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="slide-orden" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest flex items-center gap-1">
                      <GripVertical className="w-3.5 h-3.5" /> Orden
                    </label>
                    <input id="slide-orden" type="number" min={0} value={form.orden} onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) || 0 })} className={fieldCls} />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="slide-estado" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Estado</label>
                    <select id="slide-estado" value={form.activo ? '1' : '0'} onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })} className={`${fieldCls} appearance-none cursor-pointer`}>
                      <option value="1">Activo (visible)</option>
                      <option value="0">Inactivo (oculto)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving || uploading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving || uploading}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando…
                      </>
                    ) : editingSlide ? 'Actualizar slide' : 'Crear slide'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Slide"
        description={`¿Estás seguro de que deseas eliminar el slide "${confirmDelete?.titulo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Preview — misma composición que el banner del login */}
      <Dialog open={!!previewSlide} onOpenChange={(open) => !open && setPreviewSlide(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[28px]">
          {previewSlide && (
            <div className="relative h-80 auth-banner rounded-none">
              {previewSlide.imagen_url && (
                <Image src={previewSlide.imagen_url} alt={previewSlide.titulo} fill unoptimized sizes="(max-width: 768px) 100vw, 672px" className="object-cover opacity-55" style={{ filter: 'saturate(0.8)' }} />
              )}
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                {previewSlide.badge_texto && <p className="auth-tag mb-3">{previewSlide.badge_texto}</p>}
                <div className="auth-glass p-6">
                  <h3 className="auth-banner-title">{previewSlide.titulo}</h3>
                  {previewSlide.subtitulo && <p className="mt-2 text-[15px] font-semibold text-white/90">{previewSlide.subtitulo}</p>}
                  {previewSlide.descripcion && <p className="mt-1.5 text-[15px] leading-relaxed text-white/80 line-clamp-2">{previewSlide.descripcion}</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
