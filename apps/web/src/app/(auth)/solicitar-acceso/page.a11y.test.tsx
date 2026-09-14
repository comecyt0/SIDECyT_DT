import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import SolicitarAccesoPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : ''} />
  ),
}));
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
  },
}));

describe('SolicitarAccesoPage — accesibilidad', () => {
  it('no tiene violaciones axe en el paso 0 (Cuenta)', async () => {
    const { container } = render(<SolicitarAccesoPage />);
    await waitFor(() => {
      expect(container.querySelector('form')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
