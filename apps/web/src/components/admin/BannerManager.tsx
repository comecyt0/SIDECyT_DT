'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Link2, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import api from '@/lib/api';

/**
 * Dominios aceptados para banners por enlace. Deben coincidir con `comecyt.banners.hosts` (backend) y con
 * IMG_ORIGINS de next.config.ts (CSP img-src). El backend vuelve a validar todo (regla 9).
 */
const HOSTS = ['comecyt.edomex.gob.mx', 'images.comecyt.gob.mx', 'comecyt-sistemas.edomex.gob.mx', 'sidecyt-comecyt.edomex.gob.mx'];
const MAX_MB = 5;
const MIN_W = 600;
const MIN_H = 200;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  /** Ruta del endpoint, p. ej. `/admin/convocatorias/5/banner` o `/admin/programas/2/banner`. */
  endpoint: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Qué se muestra en la landing si no hay banner propio (p. ej. el del programa). */
  fallbackUrl?: string | null;
  fallbackLabel?: string;
  title?: string;
  description?: string;
}

function medir(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { reject(new Error('imagen')); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function errorDe(e: unknown, def: string): string {
  const r = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
  return r?.errors ? Object.values(r.errors).flat()[0] : (r?.message ?? def);
}

/** Banner o imagen representativa (E40). Solo se monta en vistas de admin; el backend exige rol admin. */
export default function BannerManager({
  endpoint, value, onChange, fallbackUrl, fallbackLabel = 'el del programa',
  title = 'Banner', description = 'Imagen representativa que se muestra en la página pública.',
}: Props) {
  const [modo, setModo] = useState<'archivo' | 'enlace'>('archivo');
  const [enlace, setEnlace] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const subirArchivo = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setOk(null);
    if (!TIPOS.includes(file.type)) return setError('La imagen debe ser JPG, PNG o WebP.');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`La imagen pesa más de ${MAX_MB} MB.`);
    try {
      const { w, h } = await medir(file);
      if (w < MIN_W || h < MIN_H) return setError(`La imagen es muy pequeña (${w}×${h}). Mínimo ${MIN_W}×${MIN_H} px.`);
    } catch {
      return setError('No se pudo leer la imagen.');
    }
    const fd = new FormData();
    fd.append('banner', file);
    setSaving(true);
    try {
      const { data } = await api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(data.banner_url ?? null);
      setOk('Banner actualizado.');
    } catch (e) {
      setError(errorDe(e, 'No se pudo subir la imagen.'));
    } finally {
      setSaving(false);
      if (input.current) input.current.value = '';
    }
  };

  const guardarEnlace = async () => {
    setError(null);
    setOk(null);
    let u: URL;
    try { u = new URL(enlace.trim()); } catch { return setError('Pega un enlace completo, por ejemplo https://comecyt.edomex.gob.mx/imagen.jpg'); }
    if (u.protocol !== 'https:') return setError('El enlace debe empezar con https://');
    if (!HOSTS.includes(u.hostname.toLowerCase())) return setError(`Ese dominio no está autorizado. Usa uno de: ${HOSTS.join(', ')}, o sube la imagen desde tu equipo.`);
    setSaving(true);
    try {
      const { data } = await api.post(endpoint, { banner_url: u.toString() });
      onChange(data.banner_url ?? null);
      setEnlace('');
      setOk('Banner actualizado.');
    } catch (e) {
      setError(errorDe(e, 'No se pudo guardar el enlace.'));
    } finally {
      setSaving(false);
    }
  };

  const quitar = async () => {
    setConfirmar(false);
    setSaving(true);
    setError(null);
    try {
      await api.delete(endpoint);
      onChange(null);
      setOk('Banner eliminado.');
    } catch (e) {
      setError(errorDe(e, 'No se pudo quitar el banner.'));
    } finally {
      setSaving(false);
    }
  };

  const vista = value || fallbackUrl || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle><ImageIcon className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" /> {title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {ok && <AlertBox type="success" message={ok} onClose={() => setOk(null)} />}

        {/* Ancho máximo: a 3:1 sobre todo el ancho la vista previa medía >400 px de alto en escritorio. */}
        <div className="relative aspect-[3/1] w-full max-w-2xl overflow-hidden rounded-[20px] bg-[var(--auth-field)]">
          {vista ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen propia (/storage) o de dominio autorizado por la CSP
            <img src={vista} alt={`Vista previa: ${title}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--app-ink-2)]">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
              <p className="text-sm">Sin banner todavía</p>
            </div>
          )}
          {!value && fallbackUrl && (
            <span className="absolute left-3 top-3 pill" data-tone="neutral">Usando {fallbackLabel}</span>
          )}
        </div>

        <div role="tablist" aria-label="Cómo cargar el banner" className="inline-flex gap-1 rounded-full bg-[var(--auth-field)] p-1">
          {([['archivo', 'Subir desde mi equipo', Upload], ['enlace', 'Pegar enlace', Link2]] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={modo === k}
              onClick={() => setModo(k)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${modo === k ? 'bg-[var(--app-card-bg)] text-[var(--app-ink)] shadow-sm' : 'text-[var(--app-ink-2)] hover:text-[var(--app-ink)]'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        {modo === 'archivo' ? (
          <div className="space-y-2">
            <input
              ref={input}
              id={`${endpoint}-archivo`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => subirArchivo(e.target.files?.[0])}
              disabled={saving}
            />
            <Button variant="outline" onClick={() => input.current?.click()} isLoading={saving}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Elegir imagen
            </Button>
            <p className="text-xs text-[var(--app-ink-2)]">JPG, PNG o WebP · hasta {MAX_MB} MB · mínimo {MIN_W}×{MIN_H} px. Recomendado 1600×540 (proporción 3:1).</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`${endpoint}-enlace`}>Enlace de la imagen (https)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={`${endpoint}-enlace`}
                type="url"
                inputMode="url"
                value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
                placeholder="https://comecyt.edomex.gob.mx/…/banner.jpg"
                className="auth-input auth-input-static flex-1 pl-4"
              />
              <Button onClick={guardarEnlace} isLoading={saving} disabled={!enlace.trim()}>Usar enlace</Button>
            </div>
            <p className="text-xs text-[var(--app-ink-2)]">Solo dominios institucionales autorizados: {HOSTS.join(', ')}.</p>
          </div>
        )}

        {value && (
          <Button variant="destructive" size="sm" onClick={() => setConfirmar(true)} disabled={saving}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Quitar banner
          </Button>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmar}
        title="¿Quitar el banner?"
        description={fallbackUrl ? `La página pública mostrará ${fallbackLabel}.` : 'La página pública se mostrará sin imagen.'}
        confirmLabel="Quitar banner"
        variant="destructive"
        onConfirm={quitar}
        onCancel={() => setConfirmar(false)}
      />
    </Card>
  );
}
