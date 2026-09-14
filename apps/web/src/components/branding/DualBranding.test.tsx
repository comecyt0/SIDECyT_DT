import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/image — en jsdom no resuelve el loader de Next; renderizamos un <img> básico.
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    unoptimized?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

import DualBranding from './DualBranding';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_EDOMEX_LOGO_URL;

describe('DualBranding', () => {
  beforeEach(() => {
    // Reseteamos antes de cada test para evitar fugas entre casos.
    delete process.env.NEXT_PUBLIC_EDOMEX_LOGO_URL;
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.NEXT_PUBLIC_EDOMEX_LOGO_URL;
    } else {
      process.env.NEXT_PUBLIC_EDOMEX_LOGO_URL = ORIGINAL_ENV;
    }
  });

  it('renderiza ambos logos por defecto (sin env var)', () => {
    render(<DualBranding />);

    const comecyt = screen.getByAltText('COMECYT');
    const edomex = screen.getByAltText('Gobierno del Estado de México');

    expect(comecyt).toBeInTheDocument();
    expect(comecyt).toHaveAttribute('src', '/logo.png');

    expect(edomex).toBeInTheDocument();
    expect(edomex).toHaveAttribute('src', '/logo-edomex.svg');

    // El separador debe existir cuando se muestran los dos logos.
    expect(screen.getByTestId('dual-branding-separator')).toBeInTheDocument();
  });

  it('usa el valor de NEXT_PUBLIC_EDOMEX_LOGO_URL cuando está definido', () => {
    process.env.NEXT_PUBLIC_EDOMEX_LOGO_URL = '/custom-edomex.png';

    render(<DualBranding />);

    const edomex = screen.getByAltText('Gobierno del Estado de México');
    expect(edomex).toHaveAttribute('src', '/custom-edomex.png');
  });

  it('renderiza solo COMECYT cuando NEXT_PUBLIC_EDOMEX_LOGO_URL === "none"', () => {
    process.env.NEXT_PUBLIC_EDOMEX_LOGO_URL = 'none';

    render(<DualBranding />);

    expect(screen.getByAltText('COMECYT')).toBeInTheDocument();
    expect(screen.queryByAltText('Gobierno del Estado de México')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dual-branding-separator')).not.toBeInTheDocument();
  });

  it('soporta tamaños sm / md / lg sin romper el render', () => {
    const { rerender } = render(<DualBranding size="sm" />);
    expect(screen.getByAltText('COMECYT')).toBeInTheDocument();

    rerender(<DualBranding size="md" />);
    expect(screen.getByAltText('COMECYT')).toBeInTheDocument();

    rerender(<DualBranding size="lg" />);
    expect(screen.getByAltText('COMECYT')).toBeInTheDocument();
  });

  it('aplica orientación vertical cuando vertical=true', () => {
    render(<DualBranding vertical />);

    const container = screen.getByTestId('dual-branding');
    expect(container.className).toMatch(/flex-col/);
  });
});
