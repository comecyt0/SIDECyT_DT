'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import esMessages from './messages/es.json';
import enMessages from './messages/en.json';

export type Locale = 'es' | 'en';

type Messages = typeof esMessages;

const dictionaries: Record<Locale, Messages> = {
  es: esMessages,
  en: enMessages,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * Resuelve un path tipo "common.save" en el objeto de mensajes.
 * Si la key no existe, retorna la propia key (visible en dev).
 */
function lookup(messages: Messages, key: string): string {
  const parts = key.split('.');
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof cur === 'string' ? cur : key;
}

/** ICU-simple interpolation `{name}` → values.name */
function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in values ? String(values[name]) : `{${name}}`
  );
}

export function I18nProvider({ children, defaultLocale = 'es' }: { children: React.ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Cargar locale persistido al montar (evita hydration mismatch usando useEffect)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('locale') as Locale | null;
      if (saved && (saved === 'es' || saved === 'en')) {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      } else {
        document.documentElement.lang = defaultLocale;
      }
    } catch {
      // localStorage bloqueado: usar default
    }
  }, [defaultLocale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('locale', l);
      document.documentElement.lang = l;
    } catch {
      // ignorar
    }
  }, []);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const messages = dictionaries[locale];
      return interpolate(lookup(messages, key), values);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Permitir uso sin provider (devuelve la key) — útil para tests
    return {
      locale: 'es' as Locale,
      setLocale: () => {},
      t: (key: string) => key,
    } satisfies I18nContextType;
  }
  return ctx;
}
