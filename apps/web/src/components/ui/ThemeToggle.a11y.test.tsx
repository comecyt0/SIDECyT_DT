import { describe, it, expect, beforeAll } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import ThemeToggle from './ThemeToggle';
import { ThemeProvider } from '@/contexts/ThemeContext';

// jsdom no implementa window.matchMedia; ThemeProvider lo usa al montar.
beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

describe('ThemeToggle — accesibilidad', () => {
  it('no tiene violaciones axe cuando el botón ya se montó', async () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    // El componente renderiza un placeholder aria-hidden antes de montarse.
    // Esperar a que aparezca el botón real (con aria-label).
    await waitFor(() => {
      expect(container.querySelector('button[aria-label]')).toBeTruthy();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
