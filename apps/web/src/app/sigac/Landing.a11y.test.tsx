import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import Landing from './Landing';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
vi.mock('@/components/ui/GlobalLoader', () => ({
  useGlobalLoader: () => ({ isLoading: false, setIsLoading: vi.fn(), message: undefined, setMessage: vi.fn() }),
}));

// jsdom no implementa matchMedia ni IntersectionObserver (los usan Framer y el collage).
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }),
});
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IO });
Object.defineProperty(globalThis, 'IntersectionObserver', { writable: true, value: IO });

describe('Landing /sigac', () => {
  it('no tiene violaciones axe', async () => {
    const { container } = render(<Landing />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('valida el correo antes de ir al login y lo manda prellenado', () => {
    render(<Landing />);
    const input = screen.getByLabelText('Correo institucional');
    const submit = screen.getByRole('button', { name: 'Continuar al inicio de sesión' });

    fireEvent.change(input, { target: { value: 'sin-arroba' } });
    fireEvent.click(submit);
    expect(screen.getByRole('alert').textContent).toMatch(/correo válido/);
    expect(push).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'persona@institucion.edu.mx' } });
    fireEvent.click(submit);
    expect(push).toHaveBeenCalledWith('/login?email=persona%40institucion.edu.mx');
  });

  it('enlaza al login y a solicitar acceso', () => {
    const { container } = render(<Landing />);
    expect(container.querySelector('a[href="/login"]')).toBeTruthy();
    expect(container.querySelector('a[href="/solicitar-acceso"]')).toBeTruthy();
  });
});
