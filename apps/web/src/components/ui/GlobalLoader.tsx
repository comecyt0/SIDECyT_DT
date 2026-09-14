'use client';

import React, { createContext, useContext, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

interface LoaderContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  message?: string;
  setMessage: (message?: string) => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

/**
 * Global Loader Provider
 * Proporciona un loading screen global para la aplicación
 */
export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

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
          width={72}
          height={56}
          priority
          className="route-loading-logo h-14 w-auto object-contain"
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
