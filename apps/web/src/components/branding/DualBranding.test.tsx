import { describe, it, expect, vi } from 'vitest';
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
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

import DualBranding from './DualBranding';
import { LOGO_COMECYT } from '@/lib/identidad';

describe('DualBranding (logo oficial COMECYT 2026, E50)', () => {
  it('usa el logo oficial a color con sus medidas reales', () => {
    render(<DualBranding />);
    const logo = screen.getByAltText(LOGO_COMECYT.color.alt);
    expect(logo).toHaveAttribute('src', '/identidad/comecyt-color.png');
    expect(logo).toHaveAttribute('width', '721');
    expect(logo).toHaveAttribute('height', '312');
  });

  it('ya no muestra el marcador de posición de Edomex (lo sustituye la franja institucional)', () => {
    render(<DualBranding />);
    expect(screen.queryByAltText('Gobierno del Estado de México')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('soporta todos los tamaños sin romper el render', () => {
    const { rerender } = render(<DualBranding size="sm" />);
    for (const size of ['md', 'lg', 'xl'] as const) {
      rerender(<DualBranding size={size} />);
      expect(screen.getByAltText(LOGO_COMECYT.color.alt)).toBeInTheDocument();
    }
  });
});
