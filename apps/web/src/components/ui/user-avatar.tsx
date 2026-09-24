'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Identificador visual de un usuario en todo el sistema (E45, punto 3): foto de perfil o, si no tiene, sus
 * iniciales sobre un pastel estable (mismo color siempre para la misma persona). Con `href` lleva a su ficha.
 * La imagen solo se acepta si es una ruta del propio sitio (/api/media/perfil/…): nunca una URL externa.
 */
export interface AvatarUser {
  id?: number | null;
  name?: string | null;
  avatar_url?: string | null;
}

const TAMANOS = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
  '2xl': 'h-32 w-32 text-3xl',
} as const;

const PASTELES = ['var(--pastel-blush)', 'var(--pastel-lavender)', 'var(--pastel-mint)', 'var(--pastel-powder)', 'var(--pastel-butter)', 'var(--pastel-vino)'];

export function iniciales(nombre?: string | null): string {
  // Solo palabras que empiezan con letra: "Prototipos 2026 (prueba)" → "P", no "P(".
  const partes = (nombre ?? '').trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  if (partes.length === 0) return '?';
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

function fotoSegura(url?: string | null): string | null {
  return typeof url === 'string' && /^\/api\/media\/perfil\/[A-Za-z0-9]{40}\.webp$/.test(url) ? url : null;
}

export default function UserAvatar({
  user,
  size = 'md',
  href,
  className,
  ring = false,
  titulo,
}: {
  user?: AvatarUser | null;
  size?: keyof typeof TAMANOS;
  href?: string;
  className?: string;
  ring?: boolean;
  titulo?: string;
}) {
  const [fallo, setFallo] = useState(false);
  const foto = fallo ? null : fotoSegura(user?.avatar_url);
  const nombre = user?.name ?? '';
  const color = PASTELES[Math.abs(Number(user?.id ?? nombre.length)) % PASTELES.length];

  const cuerpo = (
    <span
      className={cn(
        'user-avatar relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold select-none',
        TAMANOS[size],
        ring && 'ring-4 ring-[var(--app-card-bg)] shadow-[var(--sg-shadow-soft)]',
        className,
      )}
      style={foto ? undefined : { background: color, color: 'var(--sg-ink, #08304c)' }}
      title={titulo ?? (nombre || undefined)}
    >
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API con sesión
        <img src={foto} alt={nombre ? `Foto de ${nombre}` : ''} className="h-full w-full object-cover" loading="lazy" decoding="async" onError={() => setFallo(true)} />
      ) : (
        <span aria-hidden={nombre ? undefined : true}>{iniciales(nombre)}</span>
      )}
    </span>
  );

  if (!href) return cuerpo;
  return (
    <Link href={href} className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={nombre ? `Ver ficha de ${nombre}` : 'Ver ficha'}>
      {cuerpo}
    </Link>
  );
}

/** Foto + nombre en línea (listas, tablas, seguimiento). */
export function UserChip({ user, sub, href, size = 'sm' }: { user?: AvatarUser | null; sub?: string | null; href?: string; size?: keyof typeof TAMANOS }) {
  const contenido = (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <UserAvatar user={user} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--app-ink)]">{user?.name ?? '—'}</span>
        {sub && <span className="block truncate text-xs text-[var(--app-ink-2)]">{sub}</span>}
      </span>
    </span>
  );
  return href ? <Link href={href} className="min-w-0 rounded-lg hover:underline">{contenido}</Link> : contenido;
}
