'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useT } from '@/i18n/I18nProvider';

/**
 * Botón compacto que rota entre light / dark / system.
 * Se muestra dentro de la top bar de todos los layouts.
 */
export default function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const { t } = useT();
  const [mounted, setMounted] = useState(false);

  // Evitar render diferente entre server y client (mode lee localStorage)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" aria-hidden="true" />;
  }

  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
  const Icon = mode === 'dark' ? Moon : mode === 'system' ? Monitor : Sun;
  const currentLabel = mode === 'dark' ? t('theme.dark') : mode === 'system' ? t('theme.system') : t('theme.light');
  const nextLabel = next === 'dark' ? t('theme.dark') : next === 'system' ? t('theme.system') : t('theme.light');

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      title={currentLabel}
      aria-label={t('theme.switch_to', { mode: nextLabel })}
      className="p-2.5 rounded-xl text-neutral-500 hover:text-primary hover:bg-primary/[8%] transition-all duration-200"
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
