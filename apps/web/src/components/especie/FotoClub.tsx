import type { ReactNode } from 'react';
import { mediaClubSegura } from '@/lib/especie';

/**
 * E52 — Logo del club o foto de un integrante. Solo pinta imágenes privadas servidas por la API
 * (`/api/media/club/<40>.webp`, con sesión y permiso); cualquier otra URL se ignora y se muestra el respaldo.
 */
export default function FotoClub({ src, alt = '', fallback, className = 'h-12 w-12 rounded-[14px]' }: {
  src: unknown; alt?: string; fallback: ReactNode; className?: string;
}) {
  const url = mediaClubSegura(src);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden bg-[var(--auth-field)] ${className}`}>
      {url
        // eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API con sesión
        ? <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        : fallback}
    </span>
  );
}
