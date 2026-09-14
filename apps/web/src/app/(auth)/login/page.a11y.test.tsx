import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import LoginPage from './page';

// Mocks de Next.js
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

// El carousel hace su propio fetch — lo mockeamos para evitar timers/async ruidoso.
vi.mock('@/components/ui/login-carousel', () => ({
  LoginCarousel: () => <div aria-hidden="true" />,
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
  },
}));

describe('LoginPage — accesibilidad', () => {
  // El botón de show/hide password ahora tiene aria-label dinámico y aria-pressed.
  it('no tiene violaciones axe (form principal)', async () => {
    const { container } = render(<LoginPage />);

    await waitFor(() => {
      expect(container.querySelector('form')).toBeTruthy();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
