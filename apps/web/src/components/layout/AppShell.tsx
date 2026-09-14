'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Cookies from 'js-cookie';
import PageTransition from '@/components/ui/PageTransition';
import GlobalSearch from '@/components/admin/GlobalSearch';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import NotificationDetailModal, { type NotificationDetail } from '@/components/notifications/NotificationDetailModal';
import DualBranding from '@/components/branding/DualBranding';
import { LogOut, Bell, Menu, X } from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/lib/format';

export interface AppNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
}

export interface AppNavGroup {
  /** Sin label → grupo "suelto" (paneles de rol con pocos items, sin encabezado). */
  label?: string;
  items: AppNavItem[];
}

interface NotificationRow {
  id: string | number;
  asunto: string;
  mensaje?: string;
  tipo?: string;
  solicitud_id?: number | null;
  solicitud?: { id: number; folio: string } | null;
  created_at?: string;
  leida_at?: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  homeHref: string;
  groups: AppNavGroup[];
  userName?: string;
  roleLabel: string;
  panelTitle: string;
  notificationCount?: number;
  notifications?: NotificationRow[];
  onMarkAsRead?: (id: string | number) => void | Promise<void>;
  onMarkAllAsRead?: () => void | Promise<void>;
  notificationsHref?: string;
  notificationSolicitudHref?: (solicitudId: number) => string;
  searchEndpoint?: string;
  searchSolicitudHref?: (folio: string) => string;
}

/**
 * Shell compartido (sidebar + topbar) que consumen AdminTopLayout y RoleTopLayout.
 * Un solo lugar para el nav interactivo del sistema — cambiarlo aquí cambia los
 * ~38 paneles de los 4 roles a la vez. Ver docs/DISENO_UI.md §Panel.
 */
export default function AppShell({
  children,
  homeHref,
  groups,
  userName = '',
  roleLabel,
  panelTitle,
  notificationCount = 0,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  notificationsHref,
  notificationSolicitudHref,
  searchEndpoint,
  searchSolicitudHref,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const [localUserName, setLocalUserName] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationDetail | null>(null);
  const notifsRef = useRef<HTMLDivElement>(null);
  const prevNotifCount = useRef(notificationCount);
  const [bellShake, setBellShake] = useState(false);

  useEffect(() => {
    if (notificationCount > prevNotifCount.current) {
      setBellShake(true);
      const timer = setTimeout(() => setBellShake(false), 700);
      return () => clearTimeout(timer);
    }
    prevNotifCount.current = notificationCount;
  }, [notificationCount]);

  useEffect(() => {
    setLocalUserName(Cookies.get('userName') || userName);
  }, [userName]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifs(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowNotifs(false);
  }, [pathname]);

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('userRole');
    Cookies.remove('userName');
    router.push('/login');
  };

  const userInitial = (localUserName || roleLabel).substring(0, 2).toUpperCase();

  // Best-match: el item cuyo href sea el prefijo MÁS LARGO de la ruta actual.
  const allItems = groups.flatMap((g) => g.items);
  const activeItem = allItems
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/') || pathname.startsWith(item.href + '?'))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const currentTitle = activeItem?.name ?? panelTitle;

  return (
    <div className="app-shell flex">
      {/* ── SIDEBAR (desktop) ── */}
      <aside className="app-sidebar hidden lg:flex lg:flex-col lg:w-[272px] lg:shrink-0 lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto">
        <Link href={homeHref} className="flex items-center gap-3 px-5 pt-6 pb-5 shrink-0">
          <Image src="/logo.png" alt={INSTITUTION.name} width={46} height={36} priority className="h-10 w-auto object-contain" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-ink-2)] leading-none">{t('nav.control_panel')}</p>
            <p className="text-sm font-extrabold text-primary leading-tight truncate">{INSTITUTION.name}</p>
          </div>
        </Link>
        <div className="px-3 pb-4 flex-1">
          <NavList groups={groups} activeHref={activeItem?.href} />
        </div>
        <div className="p-3 border-t" style={{ borderColor: 'var(--app-rule)' }}>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-[var(--brand-vino-700)] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--app-ink)] leading-none truncate">{localUserName || roleLabel}</p>
              <p className="text-[11px] text-[var(--app-ink-2)] mt-0.5 truncate">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('common.logout')}
              title={t('common.logout')}
              className="shrink-0 p-2 rounded-lg text-[var(--app-ink-2)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-160"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── SIDEBAR (mobile drawer) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="app-sidebar absolute left-0 top-0 h-full w-[82vw] max-w-[300px] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <Image src="/logo.png" alt={INSTITUTION.name} width={46} height={36} className="h-9 w-auto object-contain" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t('common.close')}
                className="p-2 rounded-lg text-[var(--app-ink-2)] hover:bg-[var(--app-hover-bg)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-3 pb-6">
              <NavList groups={groups} activeHref={activeItem?.href} onNavigate={() => setMobileOpen(false)} />
            </div>
          </motion.aside>
        </div>
      )}

      {/* ── MAIN COLUMN ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-[var(--app-content-bg)]/90 backdrop-blur-xl border-b" style={{ borderColor: 'var(--app-rule)' }}>
          <div className="h-16 px-4 md:px-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t('nav.menu')}
              className="lg:hidden p-2 -ml-1 rounded-lg text-[var(--app-ink)] hover:bg-[var(--app-hover-bg)]"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-base md:text-lg font-bold text-[var(--app-ink)] truncate">{currentTitle}</h1>

            {searchEndpoint && (
              <div className="hidden md:block ml-2">
                <GlobalSearch endpoint={searchEndpoint} solicitudHrefPattern={searchSolicitudHref} />
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />

              <div ref={notifsRef} className="relative">
                <motion.button
                  type="button"
                  onClick={() => setShowNotifs(!showNotifs)}
                  aria-label={t('notifications.title')}
                  aria-expanded={showNotifs}
                  aria-haspopup="dialog"
                  animate={bellShake ? { y: [0, -3, 0, -2, 0] } : { y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="relative p-2.5 rounded-xl text-[var(--app-ink-2)] hover:text-primary hover:bg-primary/[8%] transition-all duration-200"
                >
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--app-content-bg)] z-10"
                      />
                      <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full glow-fade opacity-70" />
                    </>
                  )}
                </motion.button>

                {showNotifs && (
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} aria-hidden="true" />
                )}

                <AnimatePresence>
                  {showNotifs && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="app-card absolute right-0 top-[calc(100%+10px)] w-80 shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b flex items-center justify-between gap-2" style={{ borderColor: 'var(--app-rule)' }}>
                        <span className="font-bold text-sm text-[var(--app-ink)]">{t('notifications.title')}</span>
                        <div className="flex items-center gap-2">
                          {notificationCount > 0 && (
                            <span className="app-tag">{notificationCount}</span>
                          )}
                          {notificationCount > 0 && onMarkAllAsRead && (
                            <button
                              type="button"
                              onClick={() => onMarkAllAsRead()}
                              className="text-[10px] font-bold text-primary hover:text-[var(--brand-vino-700)] uppercase tracking-wider"
                            >
                              {t('notifications.mark_all_read')}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y" style={{ ['--tw-divide-opacity' as string]: 1 }}>
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-[var(--app-ink-2)]">{t('notifications.empty')}</div>
                        ) : (
                          notifications.map((n, i) => {
                            const isUnread = !n.leida_at;
                            return (
                              <button
                                type="button"
                                key={n.id ?? i}
                                onClick={() => {
                                  setSelectedNotif(n as NotificationDetail);
                                  setShowNotifs(false);
                                  if (isUnread) onMarkAsRead?.(n.id);
                                }}
                                className="w-full text-left p-4 border-t first:border-t-0 hover:bg-[var(--app-hover-bg)] transition-colors cursor-pointer"
                                style={{ borderColor: 'var(--app-rule)', background: isUnread ? 'color-mix(in oklch, var(--auth-gold) 9%, transparent)' : undefined }}
                              >
                                <div className="flex items-start gap-2">
                                  {isUnread && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-[var(--app-ink)] leading-snug">{n.asunto}</p>
                                    {n.mensaje && <p className="text-xs text-[var(--app-ink-2)] mt-0.5 line-clamp-1">{n.mensaje}</p>}
                                    <p className="text-[10px] text-[var(--app-ink-2)] mt-1">{formatDate(n.created_at)}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                      {notificationsHref && (
                        <Link href={notificationsHref} onClick={() => setShowNotifs(false)}>
                          <div className="p-3 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors cursor-pointer border-t" style={{ borderColor: 'var(--app-rule)' }}>
                            {t('notifications.view_all')}
                          </div>
                        </Link>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full px-4 md:px-8 py-8 max-w-screen-2xl mx-auto">
          <PageTransition>{children}</PageTransition>
        </main>

        <NotificationDetailModal
          notification={selectedNotif}
          onClose={() => setSelectedNotif(null)}
          solicitudHrefPattern={notificationSolicitudHref}
        />

        <footer className="border-t py-4 px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: 'var(--app-rule)' }}>
          <DualBranding size="sm" />
          <div className="flex flex-col items-center sm:items-end gap-0.5">
            <p className="text-xs text-[var(--app-ink-2)]">{copyrightLine()}</p>
            <p className="text-xs text-[var(--app-ink-2)] opacity-70">{INSTITUTION.systemTagline}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Fuera de AppShell a propósito: un componente declarado dentro de otro se re-monta en
 * cada render y pierde el estado interno de Framer Motion entre renders. */
function NavList({
  groups,
  activeHref,
  onNavigate,
}: {
  groups: AppNavGroup[];
  activeHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi} className="flex flex-col gap-1">
          {group.label && (
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-ink-2)]">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const isActive = activeHref === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}>
                <motion.div
                  whileHover={{ x: isActive ? 0 : 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="app-nav-item"
                  data-active={isActive}
                >
                  <span className="app-nav-icon">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-none truncate">{item.name}</span>
                    {item.description && !isActive && (
                      <span className="block text-[11px] mt-1 truncate opacity-70">{item.description}</span>
                    )}
                  </span>
                  {item.badge != null && (
                    <span
                      className="app-tag shrink-0"
                      style={isActive ? { background: 'color-mix(in oklch, var(--auth-white) 22%, transparent)', color: 'var(--auth-white)' } : undefined}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
