'use client';

import Image from 'next/image';

type Size = 'sm' | 'md' | 'lg';

interface DualBrandingProps {
  /** Tamaño del par de logos. Default: 'md'. */
  size?: Size;
  /** Apila los logos verticalmente en lugar de horizontalmente. Default: false. */
  vertical?: boolean;
  /** Clases extra opcionales. */
  className?: string;
}

/**
 * Branding dual COMECYT + Gobierno del Estado de México.
 *
 * Se controla con `NEXT_PUBLIC_EDOMEX_LOGO_URL`:
 *  - Sin definir       → usa `/logo-edomex.svg` (placeholder local)
 *  - Ruta/URL custom   → la usa
 *  - Valor literal `'none'` → oculta el logo Edomex (modo solo-COMECYT)
 *
 * El logo COMECYT (`/logo.png`) es siempre obligatorio y nunca se omite.
 */
export default function DualBranding({
  size = 'md',
  vertical = false,
  className = '',
}: DualBrandingProps) {
  const edomexUrlRaw = process.env.NEXT_PUBLIC_EDOMEX_LOGO_URL;
  const edomexEnabled = edomexUrlRaw !== 'none';
  const edomexUrl = edomexUrlRaw && edomexUrlRaw !== 'none' ? edomexUrlRaw : '/logo-edomex.svg';

  // Dimensiones intrínsecas (para next/image). El tamaño visual lo controla Tailwind.
  // COMECYT: 401x312 (ratio ~1.286). Edomex default: 240x160 (ratio 1.5).
  const dims = {
    sm: {
      comecyt: { w: 64, h: 50, cls: 'h-7 w-auto' },
      edomex: { w: 60, h: 40, cls: 'h-7 w-auto' },
      sep: 'h-7',
    },
    md: {
      comecyt: { w: 96, h: 75, cls: 'h-10 md:h-12 w-auto' },
      edomex: { w: 90, h: 60, cls: 'h-10 md:h-12 w-auto' },
      sep: 'h-10 md:h-12',
    },
    lg: {
      comecyt: { w: 144, h: 112, cls: 'h-20 md:h-24 w-auto' },
      edomex: { w: 135, h: 90, cls: 'h-20 md:h-24 w-auto' },
      sep: 'h-16 md:h-20',
    },
  } as const;

  const d = dims[size];

  // En modo vertical separamos los logos con un divisor horizontal en lugar de vertical.
  const containerCls = vertical
    ? 'flex flex-col items-center gap-3'
    : 'flex items-center gap-3 md:gap-4';

  return (
    <div
      className={`${containerCls} ${className}`.trim()}
      data-testid="dual-branding"
    >
      <Image
        src="/logo.png"
        alt="COMECYT"
        width={d.comecyt.w}
        height={d.comecyt.h}
        priority
        className={`${d.comecyt.cls} object-contain drop-shadow-[0_4px_8px_rgba(107,31,58,0.18)]`}
      />

      {edomexEnabled && (
        <>
          {/* Separador */}
          {vertical ? (
            <span
              aria-hidden="true"
              className="block w-12 h-px bg-neutral-300 dark:bg-neutral-600"
              data-testid="dual-branding-separator"
            />
          ) : (
            <span
              aria-hidden="true"
              className={`${d.sep} w-px bg-neutral-300 dark:bg-neutral-600`}
              data-testid="dual-branding-separator"
            />
          )}

          <Image
            src={edomexUrl}
            alt="Gobierno del Estado de México"
            width={d.edomex.w}
            height={d.edomex.h}
            priority
            className={`${d.edomex.cls} object-contain`}
            unoptimized={edomexUrl.endsWith('.svg')}
          />
        </>
      )}
    </div>
  );
}
