'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import StepFrame from '@/components/ui/step-frame';
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
import PageHeader from '@/components/ui/page-header';
import api from '@/lib/api';
import { INSTITUTION } from '@/lib/institution';
import BannerImagen, { ENCUADRE_INICIAL, normalizarEncuadre, type Encuadre } from '@/components/ui/BannerImagen';
import EncuadreEditor from '@/components/admin/EncuadreEditor';

export interface CarouselSlide extends Partial<Encuadre> {
  id: number;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  imagen_url?: string;
  badge_texto?: string;
  orden: number;
  activo: boolean;
  mostrar_textos?: boolean;
}

interface Props {
  slides: CarouselSlide[];
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 8;

type FormSlide = Omit<CarouselSlide, 'id'> & Encuadre & { mostrar_textos: boolean };

const emptyForm = (): FormSlide => ({
  titulo: '',
  subtitulo: '',
  descripcion: '',
  imagen_url: '',
  badge_texto: '',
  orden: 0,
  activo: true,
  ...ENCUADRE_INICIAL,
  mostrar_textos: true,
});

/**
 * E50: sugerencia automática al subir una imagen (el admin la puede cambiar en el paso "El encuadre").
 * Banner ancho (≥ 2:1, p. ej. 1024×229) → completo, fondo difuminado y sin la tarjeta de textos (ya trae los suyos).
 */
function sugerirEncuadre(ancho: number, alto: number): Partial<FormSlide> | null {
  if (!ancho || !alto) return null;
  const r = ancho / alto;
  if (r >= 2) return { ajuste: 'completa', fondo: 'desenfoque', margen: 0, mostrar_textos: false };
  return null;
}

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
  const [sugerencia, setSugerencia] = useState('');

  const openCreate = () => {
    setEditingSlide(null);
    setForm(emptyForm());
    setSugerencia('');
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
      ...normalizarEncuadre(slide),
      mostrar_textos: slide.mostrar_textos !== false,
    });
    setSugerencia('');
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
      // 21/09/2026 (E30 en CLAUDE.md): la instancia de `api` fija 'Content-Type: application/json'
      // por defecto (lib/api.ts). Como axios revisa el Content-Type YA puesto antes de decidir qué
      // hacer con un FormData, con ese default convierte el FormData a JSON en vez de mandarlo como
      // multipart — el archivo real nunca llega y Laravel responde 422 "el campo imagen es
      // obligatorio". Hay que anular explícitamente el header con `undefined` (no alcanza con
      // omitirlo) para que el navegador ponga `multipart/form-data; boundary=...` de verdad.
      const { data } = await api.post<{ imagen_url: string }>('/admin/carousel/upload', fd, {
        headers: { 'Content-Type': undefined },
      });
      // E50: medir la imagen para sugerir el encuadre (banner ancho → completo y sin textos encima).
      const medidas = await new Promise<{ w: number; h: number }>((ok) => {
        const img = new window.Image();
        img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => ok({ w: 0, h: 0 });
        img.src = URL.createObjectURL(file);
      });
      const sug = sugerirEncuadre(medidas.w, medidas.h);
      setForm((f) => ({ ...f, imagen_url: data.imagen_url, ...(sug ?? {}) }));
      setSugerencia(sug ? `Detectamos un banner ancho (${medidas.w}×${medidas.h}): lo configuramos para verse completo y sin la tarjeta de textos. Puedes cambiarlo en el siguiente paso.` : '');
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
      <PageHeader
        eyebrow="Configuración"
        title="Carrusel del inicio de sesión"
        description="Administra los slides que se muestran en la pantalla de inicio de sesión."
        icon={<Images className="h-5 w-5" />}
        actions={
          <Button variant="rainbow" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo slide
          </Button>
        }
      />

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
                    {slide.imagen_url && <BannerImagen src={slide.imagen_url} encuadre={normalizarEncuadre(slide)} />}
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

      {/* Alta / edición por pasos (StepFrame) */}
      <StepFrame
        open={showModal}
        size="xl"
        title={editingSlide ? 'Editar diapositiva' : 'Nueva diapositiva'}
        icon={<Images className="h-5 w-5" />}
        intro={<>Cada diapositiva es <strong>una pantalla del carrusel del inicio de sesión</strong>. Primero la foto, luego cómo se encuadra, los textos y al final decides si se muestra.</>}
        error={error || null}
        success={success || null}
        submitting={saving || uploading}
        submitLabel={editingSlide ? 'Guardar cambios' : 'Publicar diapositiva'}
        onClose={() => { if (!saving && !uploading) setShowModal(false); }}
        onSubmit={handleSave}
        steps={[
          {
            key: 'imagen',
            label: 'La foto',
            question: '¿Qué imagen se verá de fondo?',
            content: (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Imagen (opcional)</label>
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
                        {/* La imagen completa (el encuadre se ajusta en el paso siguiente). */}
                        <BannerImagen src={form.imagen_url} encuadre={{ ...ENCUADRE_INICIAL, fondo: 'desenfoque' }} />
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
                  {sugerencia && <p className="text-xs rounded-xl px-3 py-2" style={{ background: 'var(--tile-sky-bg)', color: 'var(--app-ink)' }}>{sugerencia}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="slide-url" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" /> O usa una imagen ya publicada
                    {form.imagen_url && form.imagen_url.startsWith('http') && (
                      <a href={form.imagen_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1" aria-label="Abrir imagen">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </label>
                  <input id="slide-url" value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} placeholder="https://…edomex.gob.mx/imagen.jpg" className={fieldCls} />
                  <p className="text-[11px] text-[var(--app-ink-2)]">
                    Si la foto ya está en un sitio del Gobierno del Estado de México, pega aquí su dirección.
                  </p>
                </div>
              </>
            ),
          },
          {
            // E50: cómo se ve la imagen en el banner del login (completa o recortada), con vista previa real.
            key: 'encuadre',
            label: 'El encuadre',
            question: '¿Cómo se verá la imagen en el inicio de sesión?',
            content: form.imagen_url ? (
              <EncuadreEditor
                src={form.imagen_url}
                valor={{ ajuste: form.ajuste, foco_x: form.foco_x, foco_y: form.foco_y, zoom: form.zoom, fondo: form.fondo, margen: form.margen }}
                onChange={(enc) => setForm((f) => ({ ...f, ...enc }))}
                mostrarTextos={form.mostrar_textos}
                onMostrarTextos={(v) => setForm((f) => ({ ...f, mostrar_textos: v }))}
                titulo={form.titulo}
              />
            ) : (
              <p className="text-sm text-[var(--app-ink-2)]">Esta diapositiva no tiene imagen: se mostrará con el fondo institucional. Si quieres una foto, vuelve al paso anterior.</p>
            ),
          },
          {
            key: 'textos',
            label: 'Los textos',
            question: '¿Qué dirá la diapositiva?',
            validate: () => (!form.titulo.trim() ? 'Escribe el título: es lo primero que lee la persona.' : null),
            content: (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label htmlFor="slide-titulo" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Título <Asterisco /></label>
                  <input id="slide-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Gestión de Proyectos Tecnológicos" className={fieldCls} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="slide-subtitulo" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Subtítulo</label>
                  <input id="slide-subtitulo" value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} placeholder={`Ej: Plataforma ${INSTITUTION.name}`} className={fieldCls} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="slide-badge" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Etiqueta corta</label>
                  <input id="slide-badge" value={form.badge_texto} onChange={(e) => setForm({ ...form, badge_texto: e.target.value })} placeholder="Ej: Desarrollo Tecnológico" className={fieldCls} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label htmlFor="slide-desc" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Descripción</label>
                  <textarea
                    id="slide-desc"
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Una o dos frases (opcional)"
                    className="w-full px-4 py-3 rounded-[var(--auth-radius-field)] text-sm resize-none h-20 outline-none transition-colors"
                    style={{ border: '1.5px solid var(--auth-rule)', background: 'var(--auth-field)', color: 'var(--auth-ink)' }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'orden',
            label: 'Cuándo se ve',
            question: '¿En qué lugar y se muestra ya?',
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="slide-orden" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest flex items-center gap-1">
                    <GripVertical className="w-3.5 h-3.5" /> Posición
                  </label>
                  <input id="slide-orden" type="number" min={0} value={form.orden} onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) || 0 })} className={fieldCls} />
                  <p className="text-[11px] text-[var(--app-ink-2)]">Las de número más bajo se ven primero.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="slide-estado" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Visibilidad</label>
                  <select id="slide-estado" value={form.activo ? '1' : '0'} onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })} className={`${fieldCls} cursor-pointer`}>
                    <option value="1">Se muestra en el inicio de sesión</option>
                    <option value="0">Guardada, sin mostrar</option>
                  </select>
                </div>
              </div>
            ),
          },
        ]}
      />

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
            <div className="relative h-[28rem] auth-banner rounded-none">
              {previewSlide.imagen_url && <BannerImagen src={previewSlide.imagen_url} encuadre={normalizarEncuadre(previewSlide)} />}
              {previewSlide.imagen_url && <span className="auth-banner-scrim" data-textos={previewSlide.mostrar_textos !== false} />}
              {previewSlide.mostrar_textos !== false && (
                <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                  {previewSlide.badge_texto && <p className="auth-tag mb-3">{previewSlide.badge_texto}</p>}
                  <div className="auth-glass p-6">
                    <h3 className="auth-banner-title">{previewSlide.titulo}</h3>
                    {previewSlide.subtitulo && <p className="mt-2 text-[15px] font-semibold text-white/90">{previewSlide.subtitulo}</p>}
                    {previewSlide.descripcion && <p className="mt-1.5 text-[15px] leading-relaxed text-white/80 line-clamp-2">{previewSlide.descripcion}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
