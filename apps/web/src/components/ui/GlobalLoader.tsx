'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

interface LoaderContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  message?: string;
  setMessage: (message?: string) => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

/** Una vez visible, no desaparece antes de esto — evita el parpadeo de un spinner que se
 * alcanza a ver 80 ms. Ver docs/DISENO_UI.md §Pantalla de carga. */
const MIN_VISIBLE_MS = 1000;

/**
 * Global Loader Provider
 * Proporciona un loading screen global para la aplicación
 */
export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoadingState] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const shownAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setIsLoading = useCallback((loading: boolean) => {
    if (loading) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      shownAtRef.current = Date.now();
      setIsLoadingState(true);
      return;
    }
    const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : MIN_VISIBLE_MS;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if (remaining === 0) {
      shownAtRef.current = null;
      setIsLoadingState(false);
    } else {
      hideTimerRef.current = setTimeout(() => {
        shownAtRef.current = null;
        hideTimerRef.current = null;
        setIsLoadingState(false);
      }, remaining);
    }
  }, []);

  return (
    <LoaderContext.Provider value={{ isLoading, setIsLoading, message, setMessage }}>
      {children}
      <GlobalLoaderScreen isVisible={isLoading} message={message} />
    </LoaderContext.Provider>
  );
}

/**
 * Hook para controlar el loader global
 */
export function useGlobalLoader() {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useGlobalLoader debe ser usado dentro de GlobalLoaderProvider');
  }
  return context;
}

/**
 * Pantalla de carga del sistema — logo quieto al centro, dos anillos concéntricos
 * en tinta muy tenue que laten hacia afuera (sonar), fondo translúcido con blur
 * (nunca un velo oscuro saturado). Estilo definido en globals.css (.route-loading-*).
 * Usada por el GlobalLoader (acciones largas explícitas) y por cada loading.tsx de
 * Next.js (cambio de página / primera carga). Ver docs/DISENO_UI.md §Pantalla de carga.
 */
export function RouteLoadingScreen({ message }: { message?: string }) {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <div className="route-loading-rings">
        <span className="route-loading-ring" aria-hidden="true" />
        <span className="route-loading-ring" aria-hidden="true" />
        <Image
          src="/logo.png"
          alt={message ?? 'Cargando'}
          width={185}
          height={144}
          priority
          className="route-loading-logo h-36 w-auto object-contain"
        />
      </div>
      {message && <p className="sr-only">{message}</p>}
    </div>
  );
}

interface GlobalLoaderScreenProps {
  isVisible: boolean;
  message?: string;
}

function GlobalLoaderScreen({ isVisible, message }: GlobalLoaderScreenProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <RouteLoadingScreen message={message} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Simple spinner component para usar en componentes locales
 */
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`rounded-full border-2 border-transparent border-t-current border-r-current ${sizeMap[size]} ${className}`}
    />
  );
}

/**
 * Skeleton loader para cargas progresivas
 */
export function SkeletonLoader({
  width = 'w-full',
  height = 'h-4',
  count = 3,
  className = '',
}: {
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`${width} ${height} bg-neutral-200 dark:bg-neutral-700 rounded-md`}
        />
      ))}
    </div>
  );
}
