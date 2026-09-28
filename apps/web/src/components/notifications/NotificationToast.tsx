'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import type { Notificacion } from '@/hooks/useNotifications';
import { useT } from '@/i18n/I18nProvider';

const AUTO_HIDE_MS = 8000;

interface Props {
  notification: Notificacion | null;
  /** A dónde lleva "Ver" (la solicitud relacionada o el historial de avisos). */
  href?: string;
  onClose: () => void;
}

/** Aviso flotante cuando llega una notificación por WebSocket (misma tarjeta bento del sistema). */
export default function NotificationToast({ notification, href, onClose }: Props) {
  const { t } = useT();
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(onClose, AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [notification, onClose]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={String(notification.id)}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring' as const, damping: 26, stiffness: 300 }}
          className="app-card fixed z-[60] bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-[380px] p-4 flex items-start gap-3"
        >
          <span className="app-tile-icon shrink-0" style={{ color: 'var(--tile-gold-fg)' }}>
            <BellRing className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--auth-vino)' }}>{t('notifications.new')}</p>
            <p className="text-sm font-bold text-[var(--app-ink)] leading-snug">{notification.asunto}</p>
            {notification.mensaje && (
              <p className="mt-0.5 text-xs text-[var(--app-ink-2)] line-clamp-2">{notification.mensaje.replace(/<[^>]+>/g, '')}</p>
            )}
            {href && (
              <Link href={href} onClick={onClose} className="mt-2 inline-flex text-xs font-bold" style={{ color: 'var(--auth-vino)' }}>
                {t('notifications.view_now')}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('notifications.dismiss')}
            className="p-1.5 rounded-lg text-[var(--app-ink-2)] hover:bg-[var(--app-hover-bg)] transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
