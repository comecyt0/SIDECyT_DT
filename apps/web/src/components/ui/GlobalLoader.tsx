'use client';

import React, { createContext, useContext, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import designTokens from '@/lib/design-system';

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
 * GlobalLoaderScreen Component
 * Pantalla de carga profesional con animaciones
 */
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
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col items-center gap-6 bg-white/95 backdrop-blur-xl rounded-3xl p-12 shadow-2xl max-w-sm"
          >
            {/* Logo with pulse animation */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full blur-xl opacity-20" />
              <Image
                src="/logo.png"
                alt="COMECYT"
                width={96}
                height={96}
                className="h-24 w-24 object-contain relative z-10"
              />
            </motion.div>

            {/* Spinner animation */}
            <div className="relative w-16 h-16">
              {/* Outer ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border-4 border-transparent border-t-primary-600 border-r-secondary-400 rounded-full"
              />
              {/* Inner ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-2 border-4 border-transparent border-b-primary-400 border-l-secondary-500 rounded-full"
              />
              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-primary-600 rounded-full" />
              </div>
            </div>

            {/* Status message */}
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-neutral-900">
                {message || 'Cargando...'}
              </h3>
              <p className="text-sm text-neutral-500">
                Por favor espera mientras procesamos tu solicitud
              </p>
            </div>

            {/* Loading dots animation */}
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: designTokens.colors.primary[600],
                  }}
                />
              ))}
            </div>
          </motion.div>
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
