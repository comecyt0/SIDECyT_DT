'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INSTITUTION } from '@/lib/institution';

/**
 * Tipo del evento `beforeinstallprompt` — W3C App Manifest spec.
 *
 * No está incluido en `lib.dom` todavía, así que lo declaramos localmente.
 * Soportado en Chrome, Edge, Opera y otros basados en Chromium.
 *
 * Nota iOS Safari:
 *   Safari en iOS NO dispara `beforeinstallprompt`. Allí la instalación
 *   debe hacerse manualmente desde el menú "Compartir → Añadir a pantalla
 *   de inicio". Este componente se degrada silenciosamente en ese caso.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_STORAGE_KEY = 'comecyt:pwa-install-dismissed-until';
const DISMISS_DAYS = 7;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;

function isDismissedActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const until = Number.parseInt(raw, 10);
    if (Number.isNaN(until)) return false;
    return Date.now() < until;
  } catch {
    return false;
  }
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Standard PWA detection (Chrome/Edge/Firefox).
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    // Safari iOS legacy.
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return true;
  } catch {
    // ignore
  }
  return false;
}

/**
 * Card flotante para instalar la app como PWA.
 *
 * - Captura `beforeinstallprompt` y suprime el prompt nativo del navegador.
 * - Permite al usuario instalar con un click o posponer 7 días.
 * - Se oculta si ya está instalada (display-mode: standalone).
 * - Se oculta tras `appinstalled`.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isStandaloneDisplay()) return;
    if (isDismissedActive()) return;

    const handleBeforeInstall = (event: Event) => {
      // El evento es de tipo BeforeInstallPromptEvent en navegadores Chromium.
      const promptEvent = event as BeforeInstallPromptEvent;
      // Suprimimos el mini-infobar nativo para mostrar nuestro card.
      promptEvent.preventDefault();
      setDeferred(promptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setDeferred(null);
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setVisible(false);
        setDeferred(null);
      } else {
        // Si el usuario rechaza desde el prompt nativo, lo postergamos 7 días.
        try {
          window.localStorage.setItem(
            DISMISS_STORAGE_KEY,
            String(Date.now() + DISMISS_MS),
          );
        } catch {
          // ignore storage errors
        }
        setVisible(false);
      }
    } catch (err) {
      // El navegador puede rechazar prompt() si fue consumido. Cerramos el card.
      console.warn('[InstallPrompt] prompt() error:', err);
      setVisible(false);
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  const handleDismiss = useCallback(() => {
    try {
      window.localStorage.setItem(
        DISMISS_STORAGE_KEY,
        String(Date.now() + DISMISS_MS),
      );
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {visible && deferred && (
        <motion.div
          role="dialog"
          aria-labelledby="comecyt-install-title"
          aria-describedby="comecyt-install-desc"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring' as const, damping: 24, stiffness: 260 }}
          className="fixed bottom-4 right-4 max-w-sm z-50 rounded-xl bg-white text-neutral-900 ring-1 ring-neutral-200 shadow-xl dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-700"
        >
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar aviso de instalación"
            className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 p-4 pr-9">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2 dark:bg-primary/20">
              <Image
                src="/logo.png"
                alt={INSTITUTION.name}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p
                id="comecyt-install-title"
                className="text-sm font-semibold leading-snug"
              >
                Instala {INSTITUTION.name}
              </p>
              <p
                id="comecyt-install-desc"
                className="mt-1 text-xs text-neutral-600 dark:text-neutral-400"
              >
                Instala {INSTITUTION.name} para acceso rápido y soporte offline.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={installing}
            >
              Ahora no
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleInstall}
              isLoading={installing}
            >
              <Download className="h-4 w-4" />
              Instalar
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
