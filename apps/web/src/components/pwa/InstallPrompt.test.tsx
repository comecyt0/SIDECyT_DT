import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import InstallPrompt, { type BeforeInstallPromptEvent } from './InstallPrompt';

const DISMISS_STORAGE_KEY = 'comecyt:pwa-install-dismissed-until';

/**
 * Construye un evento `beforeinstallprompt` simulado.
 * Soporta override de `prompt()` y `userChoice` para los distintos casos.
 */
function makeBeforeInstallPromptEvent(opts: {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
} = {}): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt') as Event &
    Partial<BeforeInstallPromptEvent>;
  Object.defineProperty(event, 'platforms', {
    value: ['web'],
    configurable: true,
  });
  Object.defineProperty(event, 'userChoice', {
    value:
      opts.userChoice ??
      Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    configurable: true,
  });
  Object.defineProperty(event, 'prompt', {
    value: opts.prompt ?? vi.fn().mockResolvedValue(undefined),
    configurable: true,
  });
  return event as BeforeInstallPromptEvent;
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // jsdom no implementa matchMedia; lo stubbeamos para evitar excepciones.
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }),
      });
    }
  });

  it('no renderiza si no se disparó beforeinstallprompt', () => {
    render(<InstallPrompt />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(/Instalar/i)).toBeNull();
  });

  it('renderiza al disparar beforeinstallprompt y suprime el prompt nativo', async () => {
    render(<InstallPrompt />);
    const evt = makeBeforeInstallPromptEvent();
    const preventDefaultSpy = vi.spyOn(evt, 'preventDefault');

    act(() => {
      window.dispatchEvent(evt);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/acceso rápido y soporte offline/i),
    ).toBeInTheDocument();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('click en "Instalar" llama deferred.prompt()', async () => {
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const evt = makeBeforeInstallPromptEvent({
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });

    render(<InstallPrompt />);
    act(() => {
      window.dispatchEvent(evt);
    });

    const installBtn = await screen.findByRole('button', { name: /Instalar/i });
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
  });

  it('click en "Ahora no" guarda flag con expiración futura en localStorage', async () => {
    const evt = makeBeforeInstallPromptEvent();
    render(<InstallPrompt />);
    act(() => {
      window.dispatchEvent(evt);
    });

    const dismissBtn = await screen.findByRole('button', { name: /Ahora no/i });
    const before = Date.now();
    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    const stored = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const until = Number.parseInt(stored as string, 10);
    expect(Number.isNaN(until)).toBe(false);
    // Debe ser al menos ~7 días en el futuro.
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(until).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  });
});
