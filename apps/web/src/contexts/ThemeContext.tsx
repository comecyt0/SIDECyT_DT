'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme-mode';

/** Calcula si el tema efectivo es dark, dado el mode y el OS. */
function resolveIsDark(mode: ThemeMode): boolean {
  if (typeof window === 'undefined') return false;
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  // system
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Aplica/quita la clase .dark al <html>. Fuente única de verdad del DOM. */
function applyDarkClass(isDark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
  // Algunos componentes leen el atributo data-theme — lo mantenemos sincronizado.
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
}

/**
 * Theme Provider.
 *
 * Reglas:
 * - mode='light'  → siempre light (ignora OS)
 * - mode='dark'   → siempre dark (ignora OS)
 * - mode='system' → sigue prefers-color-scheme y reacciona en vivo a cambios del OS
 *
 * Persiste `mode` (no `isDark`) en localStorage bajo 'theme-mode'.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [isDark, setIsDarkState] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Mount: leer persistencia + aplicar inmediatamente.
  useEffect(() => {
    let initial: ThemeMode = 'system';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        initial = saved;
      }
    } catch {
      // localStorage bloqueado: usar 'system' como default seguro
    }
    setModeState(initial);
    const dark = resolveIsDark(initial);
    setIsDarkState(dark);
    applyDarkClass(dark);
    setIsMounted(true);
  }, []);

  // Cuando mode='system', escuchar cambios del OS en vivo.
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDarkState(e.matches);
      applyDarkClass(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // ignore
    }
    const dark = resolveIsDark(newMode);
    setIsDarkState(dark);
    applyDarkClass(dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode, toggleTheme }}>
      <span style={{ display: 'contents' }} suppressHydrationWarning>
        {isMounted ? children : <span suppressHydrationWarning>{children}</span>}
      </span>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de ThemeProvider');
  }
  return context;
}
