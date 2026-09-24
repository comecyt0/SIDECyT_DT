'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import UserAvatar, { type AvatarUser } from '@/components/ui/user-avatar';

/**
 * Cabecera de perfil (E45, punto 3): portada ancha, avatar circular superpuesto, nombre grande, píldoras, estado e
 * indicadores. Referencia visual del usuario (portal de cursos), adaptada al sistema SIGAC: blanco, pastel, vino de
 * detalle. Con `editable` muestra "Cambiar portada" y el botón de cámara sobre la foto.
 */
export interface PerfilHeroProps {
  user: AvatarUser & { banner_url?: string | null };
  pildoras?: { texto: string; tono?: 'vino' | 'cielo' }[];
  estado?: { texto: string; activo: boolean } | null;
  indicadores?: { label: string; value: number | string }[];
  editable?: boolean;
  subiendo?: 'avatar' | 'banner' | null;
  onSubir?: (tipo: 'avatar' | 'banner', archivo: File) => void;
  onQuitar?: (tipo: 'avatar' | 'banner') => void;
}

function portadaSegura(url?: string | null): string | null {
  return typeof url === 'string' && /^\/api\/media\/perfil\/[A-Za-z0-9]{40}\.webp$/.test(url) ? url : null;
}

export default function PerfilHero({ user, pildoras = [], estado, indicadores = [], editable = false, subiendo = null, onSubir, onQuitar }: PerfilHeroProps) {
  const inputAvatar = useRef<HTMLInputElement>(null);
  const inputBanner = useRef<HTMLInputElement>(null);
  const [fallaPortada, setFallaPortada] = useState(false);
  const portada = fallaPortada ? null : portadaSegura(user.banner_url);

  const elegir = (tipo: 'avatar' | 'banner') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f && onSubir) onSubir(tipo, f);
  };

  return (
    <section className="perfil-hero" aria-label={`Perfil de ${user.name ?? ''}`}>
      <div className="perfil-portada" data-vacia={portada ? undefined : 'true'}>
        {portada && (
          // eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API con sesión
          <img src={portada} alt="" className="perfil-portada-img" onError={() => setFallaPortada(true)} />
        )}
        {editable && (
          <div className="perfil-portada-acciones">
            <button type="button" className="perfil-btn-flotante" onClick={() => inputBanner.current?.click()} disabled={subiendo !== null}>
              {subiendo === 'banner' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />}
              Cambiar portada
            </button>
            {portada && onQuitar && (
              <button type="button" className="perfil-btn-flotante" onClick={() => onQuitar('banner')} aria-label="Quitar portada" disabled={subiendo !== null}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <input ref={inputBanner} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={elegir('banner')} tabIndex={-1} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="perfil-cuerpo">
        <div className="perfil-avatar">
          <UserAvatar user={user} size="2xl" ring />
          {editable && (
            <>
              <button type="button" className="perfil-avatar-btn" onClick={() => inputAvatar.current?.click()} aria-label="Cambiar foto de perfil" disabled={subiendo !== null}>
                {subiendo === 'avatar' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
              </button>
              <input ref={inputAvatar} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={elegir('avatar')} tabIndex={-1} aria-hidden="true" />
            </>
          )}
        </div>

        <div className="perfil-titular">
          <h1 className="perfil-nombre">{user.name ?? '—'}</h1>
          <div className="perfil-pildoras">
            {pildoras.map((p) => (
              <span key={p.texto} className="perfil-pildora" data-tono={p.tono ?? 'cielo'}>{p.texto}</span>
            ))}
            {estado && (
              <span className="perfil-estado" data-activo={estado.activo ? 'true' : 'false'}>
                <span aria-hidden="true" />{estado.texto}
              </span>
            )}
          </div>
        </div>

        {indicadores.length > 0 && (
          <dl className="perfil-indicadores">
            {indicadores.map((i) => (
              <div key={i.label}>
                <dt>{i.label}</dt>
                <dd>{i.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {editable && user.avatar_url && onQuitar && (
          <button type="button" className="perfil-quitar-foto" onClick={() => onQuitar('avatar')} disabled={subiendo !== null}>
            Quitar foto
          </button>
        )}
      </div>
    </section>
  );
}
