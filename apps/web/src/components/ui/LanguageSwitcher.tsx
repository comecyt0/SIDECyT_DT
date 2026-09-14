'use client';

import { useState } from 'react';
import { Languages } from 'lucide-react';
import { useT, type Locale } from '@/i18n/I18nProvider';

const LOCALES: Array<{ code: Locale; label: string; flag: string }> = [
  { code: 'es', label: 'Español', flag: '🇲🇽' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cambiar idioma / Switch language"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="p-2.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-primary/[8%] transition-all duration-200 inline-flex items-center gap-1"
      >
        <Languages className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{locale}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            aria-label="Idioma"
            className="absolute right-0 top-[calc(100%+8px)] w-44 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden z-50"
          >
            {LOCALES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === l.code}
                  onClick={() => {
                    setLocale(l.code);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    locale === l.code
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span aria-hidden="true">{l.flag}</span>
                  <span className="flex-1">{l.label}</span>
                  {locale === l.code && <span className="text-xs">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
