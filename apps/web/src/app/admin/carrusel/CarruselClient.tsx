'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const [confirmDelete, setConfirmDelete] = useState<CarouselSlide | null>(null);
  const [, setDeleting] = useState(false);

  const [previewSlide, setPreviewSlide] = useState<CarouselSlide | null>(null);

  const openCreate = () => {
    setEditingSlide(null);
    setForm(emptyForm());
    setError('');
    setSuccess('');
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
    setShowModal(true);
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
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Error al guardar el slide.');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Carrusel de Login</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Administra los slides que se muestran en la pantalla de inicio de sesión.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Slide
        </Button>
      </div>

      {/* Alerts */}
      {error && !showModal && (
        <AlertBox type="error" message={error} onClose={() => setError('')} />
      )}

      {/* Preview note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20 text-sm text-neutral-600 dark:text-neutral-300">
        <Images className="w-5 h-5 text-accent mt-0.5 shrink-0" />
        <div>
          <strong className="font-semibold text-neutral-700 dark:text-neutral-200">Tip:</strong> Los slides activos se muestran en la pantalla de login ordenados por el campo &quot;Orden&quot;. Usa URLs de imágenes externas (Unsplash, CDN propio) para las fotografías.
        </div>
      </div>

      {/* Slides grid */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <Images className="w-5 h-5" />
            Slides ({slides.length})
          </CardTitle>
          <CardDescription>Haz clic en un slide para editarlo o vista previa.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {slides.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500">
              <Images className="h-12 w-12 mx-auto mb-3 text-neutral-200" />
              <p>No hay slides. Crea el primero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    slide.activo
                      ? 'border-primary/20 shadow-md hover:shadow-lg hover:border-primary/40'
                      : 'border-neutral-200 dark:border-neutral-700 opacity-60'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-40 bg-gradient-to-br from-primary to-[var(--brand-vino-800)] overflow-hidden">
                    {slide.imagen_url && (
                      <Image
                        src={slide.imagen_url}
                        alt={slide.titulo}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Status + order badge */}
                    <div className="absolute top-2 left-2 flex gap-2">
                      <Badge
                        variant={slide.activo ? 'default' : 'secondary'}
                        className={`text-xs ${slide.activo ? 'bg-emerald-500 text-white' : ''}`}
                      >
                        {slide.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-black/30 text-white border-white/20">
                        Orden: {slide.orden}
                      </Badge>
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setPreviewSlide(slide)}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-all"
                        title="Vista previa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(slide)}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(slide)}
                        className="w-9 h-9 rounded-full bg-red-500/30 hover:bg-red-500/60 backdrop-blur-sm flex items-center justify-center text-white transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title on image */}
                    <div className="absolute bottom-2 left-3 right-3">
                      {slide.badge_texto && (
                        <span className="text-[10px] font-bold text-accent uppercase tracking-widest">
                          {slide.badge_texto}
                        </span>
                      )}
                      <p className="text-white font-bold text-sm line-clamp-2 drop-shadow">
                        {slide.titulo}
                      </p>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="p-3 bg-white dark:bg-neutral-900 flex items-center justify-between gap-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 flex-1">
                      {slide.subtitulo || slide.descripcion || 'Sin subtítulo'}
                    </p>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => toggleActivo(slide)}
                        className={`p-1.5 rounded-md transition-colors text-xs ${
                          slide.activo
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                        title={slide.activo ? 'Desactivar' : 'Activar'}
                      >
                        {slide.activo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openEdit(slide)}
                        className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(slide)}
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !saving && setShowModal(open)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Images className="w-5 h-5 text-primary" />
              {editingSlide ? 'Editar Slide' : 'Nuevo Slide'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}
            {success && <AlertBox type="success" message={success} />}

            {!success && (
              <>
                {/* Preview miniature */}
                {form.imagen_url && (
                  <div className="relative h-28 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <Image
                      src={form.imagen_url}
                      alt="Preview"
                      fill
                      unoptimized
                      sizes="540px"
                      className="object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                    <p className="absolute bottom-2 left-3 text-white text-sm font-bold drop-shadow">
                      {form.titulo || 'Vista previa'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Título *
                    </label>
                    <Input
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      placeholder="Ej: Gestión de Proyectos Tecnológicos"
                      className="border-neutral-200 dark:border-neutral-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Subtítulo
                    </label>
                    <Input
                      value={form.subtitulo}
                      onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
                      placeholder={`Ej: Plataforma ${INSTITUTION.name}`}
                      className="border-neutral-200 dark:border-neutral-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Badge
                    </label>
                    <Input
                      value={form.badge_texto}
                      onChange={(e) => setForm({ ...form, badge_texto: e.target.value })}
                      placeholder="Ej: Desarrollo Tecnológico"
                      className="border-neutral-200 dark:border-neutral-700"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Descripción
                    </label>
                    <textarea
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      placeholder="Breve descripción del slide (opcional)"
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1">
                      URL de Imagen
                      {form.imagen_url && (
                        <a
                          href={form.imagen_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline ml-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </label>
                    <Input
                      value={form.imagen_url}
                      onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
                      placeholder="/carrusel/mi-imagen.jpg"
                      className="border-neutral-200 dark:border-neutral-700"
                    />
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                      Sube la imagen a <code>apps/web/public/carrusel/</code> y referénciala como ruta relativa (1200×800 px recomendado).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1">
                      <GripVertical className="w-3.5 h-3.5" />
                      Orden
                    </label>
                    <Input
                      type="number"
                      value={form.orden}
                      onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) || 0 })}
                      className="border-neutral-200 dark:border-neutral-700"
                      min={0}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Estado
                    </label>
                    <select
                      value={form.activo ? '1' : '0'}
                      onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="1">Activo (visible)</option>
                      <option value="0">Inactivo (oculto)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      editingSlide ? 'Actualizar Slide' : 'Crear Slide'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Slide"
        description={`¿Estás seguro de que deseas eliminar el slide "${confirmDelete?.titulo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewSlide} onOpenChange={(open) => !open && setPreviewSlide(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl">
          {previewSlide && (
            <div className="relative h-80">
              {previewSlide.imagen_url && (
                <Image
                  src={previewSlide.imagen_url}
                  alt={previewSlide.titulo}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 672px"
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-vino-900)]/85 via-primary/75 to-[var(--brand-vino-800)]/80" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                {previewSlide.badge_texto && (
                  <span className="inline-block mb-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-bold uppercase tracking-widest w-max">
                    {previewSlide.badge_texto}
                  </span>
                )}
                <h3 className="text-2xl font-extrabold mb-1 drop-shadow-xl">{previewSlide.titulo}</h3>
                {previewSlide.subtitulo && (
                  <p className="text-accent font-semibold text-sm mb-2">{previewSlide.subtitulo}</p>
                )}
                {previewSlide.descripcion && (
                  <p className="text-white/80 text-sm border-l-2 border-accent/60 pl-3 line-clamp-2">
                    {previewSlide.descripcion}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
