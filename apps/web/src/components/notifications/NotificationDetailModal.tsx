'use client';

import { useEffect } from 'react';
import { X, Bell, FileText } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationDetail {
  id: string | number;
  asunto: string;
  mensaje?: string;
  tipo?: string;
  solicitud_id?: number | null;
  solicitud?: { id: number; folio: string } | null;
  created_at?: string;
  leida_at?: string;
}

interface Props {
  notification: NotificationDetail | null;
  onClose: () => void;
  /** Ruta donde el usuario puede ver la solicitud relacionada (depende del rol). */
  solicitudHrefPattern?: (solicitudId: number) => string;
}

export default function NotificationDetailModal({ notification, onClose, solicitudHrefPattern }: Props) {
  // Cerrar con Escape
  useEffect(() => {
    if (!notification) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notification, onClose]);

  const solicitudId = notification?.solicitud?.id ?? notification?.solicitud_id ?? null;
  const solicitudHref = solicitudHrefPattern && solicitudId ? solicitudHrefPattern(solicitudId) : null;

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-[var(--brand-vino-700)] flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-white/10 p-2 rounded-xl shrink-0">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm leading-tight truncate">{notification.asunto}</p>
                  {notification.tipo && (
                    <p className="text-white/60 text-[10px] uppercase tracking-wider mt-0.5">{notification.tipo}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="text-white/60 hover:text-white p-1 rounded-md transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {notification.mensaje ? (
                <div
                  className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: notification.mensaje }}
                />
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-300 italic">Sin contenido adicional.</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                <p className="text-xs text-neutral-500 dark:text-neutral-300">
                  {notification.created_at
                    ? new Date(notification.created_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </p>
                {solicitudHref && (
                  <Link
                    href={solicitudHref}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-[var(--brand-vino-700)] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Ver solicitud {notification.solicitud?.folio ?? `#${solicitudId}`}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
